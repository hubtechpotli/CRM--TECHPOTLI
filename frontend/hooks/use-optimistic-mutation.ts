"use client";

import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  restoreQueries,
  snapshotQueries,
  type QuerySnapshot,
} from "@/lib/optimistic-mutation";

export type OptimisticContext = {
  snapshots: QuerySnapshot[];
  tempId?: string;
  [key: string]: unknown;
};

export type OptimisticMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
> = Omit<
  UseMutationOptions<TData, TError, TVariables, OptimisticContext>,
  "onMutate"
> & {
  /** Query keys to snapshot before mutate (rolled back on error). */
  snapshotKeys?: QueryKey[] | ((variables: TVariables) => QueryKey[]);
  /** Keys to invalidate in background after settle (non-blocking). */
  invalidateKeys?: QueryKey[] | ((variables: TVariables) => QueryKey[]);
  /** Custom error toast message. */
  errorMessage?: string | ((error: TError) => string);
  onMutate?: (
    variables: TVariables,
  ) => Promise<Record<string, unknown> | void> | Record<string, unknown> | void;
};

export function useOptimisticMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
>(
  options: OptimisticMutationOptions<TData, TError, TVariables>,
) {
  const queryClient = useQueryClient();
  const {
    snapshotKeys,
    invalidateKeys,
    errorMessage = (err: TError) =>
      getApiErrorMessage(err, "Could not save changes. Reverted."),
    onMutate,
    onError,
    onSuccess,
    onSettled,
    ...rest
  } = options;

  return useMutation<TData, TError, TVariables, OptimisticContext>({
    ...rest,
    onMutate: async (variables) => {
      const keys =
        typeof snapshotKeys === "function"
          ? snapshotKeys(variables)
          : (snapshotKeys ?? []);
      const snapshots = snapshotQueries(queryClient, keys);
      const customContext = (await onMutate?.(variables)) ?? {};
      return { snapshots, ...customContext };
    },
    onError: (error, variables, context, mutation) => {
      if (context?.snapshots) {
        restoreQueries(queryClient, context.snapshots);
      }
      const msg =
        typeof errorMessage === "function"
          ? errorMessage(error)
          : errorMessage;
      toast.error(msg);
      onError?.(error, variables, context, mutation);
    },
    onSuccess: (data, variables, context, mutation) => {
      onSuccess?.(data, variables, context, mutation);
    },
    onSettled: (data, error, variables, context, mutation) => {
      const keys =
        typeof invalidateKeys === "function"
          ? invalidateKeys(variables)
          : (invalidateKeys ?? []);
      for (const queryKey of keys) {
        void queryClient.invalidateQueries({ queryKey });
      }
      onSettled?.(data, error, variables, context, mutation);
    },
  });
}
