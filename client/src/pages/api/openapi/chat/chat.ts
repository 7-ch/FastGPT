import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/service/mongo';
import { authUser, authModel, getApiKey } from '@/service/utils/auth';
import { modelServiceToolMap, resStreamResponse } from '@/service/utils/chat';
import { ChatItemSimpleType } from '@/types/chat';
import { jsonRes } from '@/service/response';
import { ChatModelMap } from '@/constants/model';
import { pushChatBill } from '@/service/events/pushBill';
import { ChatRoleEnum } from '@/constants/chat';
import { withNextCors } from '@/service/utils/tools';
import { BillTypeEnum } from '@/constants/user';
import { NEW_CHATID_HEADER } from '@/constants/chat';
import { Types } from 'mongoose';
import { appKbSearch } from '../kb/appKbSearch';

/* 发送提示词 */
export default withNextCors(async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.on('close', () => {
    res.end();
  });
  res.on('error', () => {
    console.log('error: ', 'request error');
    res.end();
  });

  try {
    const {
      chatId,
      prompts,
      modelId,
      isStream = true
    } = req.body as {
      chatId?: string;
      prompts: ChatItemSimpleType[];
      modelId: string;
      isStream: boolean;
    };

    if (!prompts || !modelId) {
      throw new Error('缺少参数');
    }
    if (!Array.isArray(prompts)) {
      throw new Error('prompts is not array');
    }
    if (prompts.length > 30 || prompts.length === 0) {
      throw new Error('Prompts arr length range 1-30');
    }

    await connectToDatabase();
    let startTime = Date.now();

    /* 凭证校验 */
    const { userId } = await authUser({ req });

    const { model } = await authModel({
      userId,
      modelId
    });

    /* get api key */
    const { systemAuthKey: apiKey } = await getApiKey({
      model: model.chat.chatModel,
      userId,
      mustPay: true
    });

    const modelConstantsData = ChatModelMap[model.chat.chatModel];
    const prompt = prompts[prompts.length - 1];

    const { userSystemPrompt = [], quotePrompt = [] } = await (async () => {
      // 使用了知识库搜索
      if (model.chat.relatedKbs?.length > 0) {
        const { userSystemPrompt, quotePrompt } = await appKbSearch({
          model,
          userId,
          fixedQuote: [],
          prompt: prompt,
          similarity: model.chat.searchSimilarity,
          limit: model.chat.searchLimit
        });

        return {
          userSystemPrompt: userSystemPrompt ? [userSystemPrompt] : [],
          quotePrompt: [quotePrompt]
        };
      }
      if (model.chat.systemPrompt) {
        return {
          userSystemPrompt: [
            {
              obj: ChatRoleEnum.System,
              value: model.chat.systemPrompt
            }
          ]
        };
      }
      return {};
    })();

    // search result is empty
    if (model.chat.relatedKbs?.length > 0 && !quotePrompt[0]?.value && model.chat.searchEmptyText) {
      const response = model.chat.searchEmptyText;
      return res.end(response);
    }

    // 读取对话内容
    const completePrompts = [...quotePrompt, ...prompts.slice(0, -1), ...userSystemPrompt, prompt];

    // 计算温度
    const temperature = (modelConstantsData.maxTemperature * (model.chat.temperature / 10)).toFixed(
      2
    );

    // get conversationId. create a newId if it is null
    const conversationId = chatId || String(new Types.ObjectId());
    !chatId && res?.setHeader(NEW_CHATID_HEADER, conversationId);

    // 发出请求
    const { streamResponse, responseMessages, responseText, totalTokens } =
      await modelServiceToolMap[model.chat.chatModel].chatCompletion({
        apiKey,
        temperature: +temperature,
        messages: completePrompts,
        stream: isStream,
        res,
        chatId: conversationId
      });

    console.log('api response time:', `${(Date.now() - startTime) / 1000}s`);

    if (res.closed) return res.end();

    const { textLen = 0, tokens = totalTokens } = await (async () => {
      if (isStream) {
        try {
          const { finishMessages, totalTokens } = await resStreamResponse({
            model: model.chat.chatModel,
            res,
            chatResponse: streamResponse,
            prompts: responseMessages
          });
          res.end();
          return {
            textLen: finishMessages.map((item) => item.value).join('').length,
            tokens: totalTokens
          };
        } catch (error) {
          res.end();
          console.log('error，结束', error);
        }
      } else {
        jsonRes(res, {
          data: responseText
        });
        return {
          textLen: responseMessages.map((item) => item.value).join('').length
        };
      }
      return {};
    })();

    pushChatBill({
      isPay: true,
      chatModel: model.chat.chatModel,
      userId,
      textLen,
      tokens,
      type: BillTypeEnum.openapiChat
    });
  } catch (err: any) {
    res.status(500);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
});
