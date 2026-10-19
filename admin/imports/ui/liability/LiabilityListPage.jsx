import React from 'react';
import { LiabilityList } from './LiabilityList';
import { useLiabilityList } from './data';

export const LiabilityListPage = () => <LiabilityList {...useLiabilityList()} />;
