import AsyncStorage from '@react-native-async-storage/async-storage';

import { createSnapshotRepository } from '../domain/persistence.ts';

export const snapshotRepository = createSnapshotRepository(AsyncStorage);
