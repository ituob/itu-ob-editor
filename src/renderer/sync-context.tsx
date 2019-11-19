/* In this context, “local storage” means Git-backed filesystem. */

import React, { useState } from 'react';


export interface Operation {
  id: string,
  description: string,
  success?: boolean,

  // Operation is not started if progress is less than 0.
  // Operation is started if progress is undefined or 0 or larger.
  // Operation is finished if progress is 1 or more.
  progress?: number, // 0 to 1
}


interface LocalStorageStatusContextSpec {
  operations: Operation[],
  isDirty: boolean,

  add: (op: Operation) => void,
  updateProgress: (opId: string, progress: number | undefined) => void,
  complete: (opId: string) => void,
  markDirty: () => void,

  getQueuedOperations: () => Operation[],
  getOperationsInProgress: () => Operation[],
  getSuccessfulOperations:() => Operation[],
  getFailedOperations: () => Operation[],
}


export const LocalStorageStatusContext = React.createContext<LocalStorageStatusContextSpec>({
  operations: [],
  isDirty: false,

  add: (op) => {},
  updateProgress: (opId, progress) => {},
  complete: (opId) => {},
  markDirty: () => {},

  getQueuedOperations: () => [],
  getOperationsInProgress: () => [],
  getSuccessfulOperations: () => [],
  getFailedOperations: () => [],
});


export const LocalStorageStatusContextProvider: React.FC<{}> = function ({ children }) {

  const initialStatus: LocalStorageStatusContextSpec = {
    operations: [],
    isDirty: false,

    markDirty: () => {
      updateStatus({ ...status, isDirty: true });
    },

    add: (op) => {
      status.operations.push(op);
      updateStatus({ ...status, operations: status.operations });
    },

    updateProgress: (opId, progress) => {
      var ops = [...status.operations];
      const opIdx = ops.findIndex(op => op.id === opId);

      if (opIdx >= 0) {
        ops[opIdx].progress = progress;
        updateStatus({ ...status, operations: ops });
      }
    },

    complete: (opId) => {
      var ops = [...status.operations];
      const opIdx = ops.findIndex(op => op.id === opId);

      if (opIdx >= 0) {
        ops[opIdx].progress = 1;
        ops[opIdx].success = true;
        const isDirty = status.getOperationsInProgress().length > 0;
        updateStatus({ ...status, operations: ops, isDirty: isDirty });
      }
    },

    getQueuedOperations: () => {
      return status.operations.filter(op => (op.progress || 0) < 0);
    },

    getOperationsInProgress: () => {
      return status.operations.filter(op => (op.progress || 0) < 1 && (op.progress || 0) >= 0);
    },

    getSuccessfulOperations: () => {
      return status.operations.filter(op => (op.progress || 0) >= 1 && op.success === true);
    },

    getFailedOperations: () => {
      return status.operations.filter(op => (op.progress || 0) >= 1 && op.success !== true);
    },

    // findOpIndex: (opId) => {
    //   return status.operations.findIndex((op: Operation) => op.id === opId);
    // },

    // addOperation: (newOp) => {
    //   updateStatus(status => {
    //     var ops = [...status.operations];
    //     const opIdx = status.findOpIndex(newOp.id);

    //     if (opIdx >= 0) {
    //       const existingOp = ops[opIdx] as Operation;

    //       // If operation with same ID exists and is finished, remove it from list
    //       if (existingOp.progress && existingOp.progress >= 1) {
    //         ops.splice(opIdx, 1);
    //       } else {
    //         throw new Error("Operation already in progress, cannot add");
    //       }
    //     }

    //     ops.push(newOp);

    //     return { ...status, operations: ops };
    //   });
    // },

    // complete: (opId, success) => {
    //   // Mark operation as successful
    //   updateStatus(status => {
    //     var ops = [...status.operations];
    //     const opIdx = status.findOpIndex(opId);
    //     if (opIdx >= 0) {
    //       ops[opIdx].success = success;
    //       ops[opIdx].progress = 1;
    //     }
    //     return { ...status, operations: ops };
    //   });
    //   // Remove operation from list later
    //   setTimeout(() => {
    //     updateStatus(status => {
    //       var ops = [...status.operations];
    //       const opIdx = status.findOpIndex(opId);
    //       if (opIdx >= 0) {
    //         ops.splice(opIdx, 1);
    //       }
    //       return { ...status, operations: ops };
    //     });
    //   }, 5000);
    // },

    // updateProgress: (opId, progress) => {
    //   updateStatus(status => {
    //     var ops = [...status.operations];
    //     const opIdx = status.findOpIndex(opId);
    //     if (opIdx >= 0) {
    //       ops[opIdx].progress = progress;
    //     }
    //     return { ...status, operations: ops };
    //   });
    // },
  };

  const [status, updateStatus] = useState(initialStatus);

  return <LocalStorageStatusContext.Provider value={status}>{children}</LocalStorageStatusContext.Provider>;
};
