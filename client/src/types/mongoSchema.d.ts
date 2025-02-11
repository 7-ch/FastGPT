import type { ChatItemType } from './chat';
import { ModelNameEnum, ChatModelType, EmbeddingModelType } from '@/constants/model';
import type { DataType } from './data';
import { BillTypeEnum, InformTypeEnum } from '@/constants/user';
import { TrainingModeEnum } from '@/constants/plugin';

export interface UserModelSchema {
  _id: string;
  username: string;
  password: string;
  avatar: string;
  balance: number;
  inviterId?: string;
  promotionAmount: number;
  openaiKey: string;
  createTime: number;
  promotion: {
    rate: number;
  };
  limit: {
    exportKbTime?: Date;
  };
}

export interface AuthCodeSchema {
  _id: string;
  username: string;
  code: string;
  type: 'register' | 'findPassword';
  expiredTime: number;
}

export interface ModelSchema {
  _id: string;
  userId: string;
  name: string;
  avatar: string;
  intro: string;
  updateTime: number;
  chat: {
    relatedKbs: string[];
    searchSimilarity: number;
    searchLimit: number;
    searchEmptyText: string;
    systemPrompt: string;
    temperature: number;
    chatModel: ChatModelType; // 聊天时用的模型，训练后就是训练的模型
  };
  share: {
    isShare: boolean;
    isShareDetail: boolean;
    collection: number;
  };
}

export interface ModelPopulate extends ModelSchema {
  userId: UserModelSchema;
}

export interface CollectionSchema {
  modelId: string;
  userId: string;
}

export type ModelDataType = 0 | 1;

export interface TrainingDataSchema {
  _id: string;
  userId: string;
  kbId: string;
  lockTime: Date;
  mode: `${TrainingModeEnum}`;
  prompt: string;
  q: string;
  a: string;
  source: string;
}

export interface ChatSchema {
  _id: string;
  userId: string;
  modelId: string;
  expiredTime: number;
  updateTime: Date;
  title: string;
  customTitle: string;
  latestChat: string;
  top: boolean;
  content: ChatItemType[];
}
export interface ChatPopulate extends ChatSchema {
  userId: UserModelSchema;
  modelId: ModelSchema;
}

export interface BillSchema {
  _id: string;
  userId: string;
  type: `${BillTypeEnum}`;
  modelName: ChatModelType | EmbeddingModelType;
  chatId: string;
  time: Date;
  textLen: number;
  tokenLen: number;
  price: number;
}

export interface PaySchema {
  _id: string;
  userId: string;
  createTime: Date;
  price: number;
  orderId: string;
  status: 'SUCCESS' | 'REFUND' | 'NOTPAY' | 'CLOSED';
}

export interface OpenApiSchema {
  _id: string;
  userId: string;
  createTime: Date;
  lastUsedTime?: Date;
  apiKey: String;
}

export interface PromotionRecordSchema {
  _id: string;
  userId: string; // 收益人
  objUId?: string; // 目标对象（如果是withdraw则为空）
  type: 'invite' | 'shareModel' | 'withdraw';
  createTime: Date; // 记录时间
  amount: number;
}

export interface ShareChatSchema {
  _id: string;
  userId: string;
  modelId: string;
  password: string;
  name: string;
  tokens: number;
  maxContext: number;
  lastTime: Date;
}

export interface kbSchema {
  _id: string;
  userId: string;
  updateTime: Date;
  avatar: string;
  name: string;
  tags: string[];
}

export interface informSchema {
  _id: string;
  userId: string;
  time: Date;
  type: `${InformTypeEnum}`;
  title: string;
  content: string;
  read: boolean;
}
