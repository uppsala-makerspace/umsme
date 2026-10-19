import React from 'react';
import { StoreItemList } from './StoreItemList';
import { useStoreItemList } from './data';

export const StoreItemListPage = () => <StoreItemList {...useStoreItemList()} />;
