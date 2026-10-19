import React from 'react';
import { MessageTemplateList } from './MessageTemplateList';
import { useMessageTemplateList } from './data';

export const MessageTemplateListPage = () => <MessageTemplateList {...useMessageTemplateList()} />;
