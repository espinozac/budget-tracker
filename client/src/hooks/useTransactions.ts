import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  Summary,
  Transaction,
  TransactionInput,
  TransactionQuery,
} from "@budget/shared";
import {
  createTransaction,
  deleteTransaction,
  getCategories,
  getSummary,
  listTransactions,
  updateTransaction,
} from "../api";

export type UseTransactionsResult = {
  transactions: Transaction[];
  summary: Summary | undefined;
  categories: string[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;
  refetchAll: () => void;
  create: (input: TransactionInput) => Promise<Transaction>;
  update: (args: {
    id: string;
    input: TransactionInput;
  }) => Promise<Transaction>;
  remove: (id: string) => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
};

const queryKeys = {
  transactions: (filters: TransactionQuery) =>
    ["transactions", filters] as const,
  summary: (filters: TransactionQuery) => ["summary", filters] as const,
  categories: ["categories"] as const,
};

export function useTransactions(
  filters: TransactionQuery,
): UseTransactionsResult {
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery({
    queryKey: queryKeys.transactions(filters),
    queryFn: ({ signal }) => listTransactions(filters, signal),
    placeholderData: keepPreviousData,
  });

  const summaryQuery = useQuery({
    queryKey: queryKeys.summary(filters),
    queryFn: ({ signal }) => getSummary(filters, signal),
    placeholderData: keepPreviousData,
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: ({ signal }) => getCategories(signal),
  });

  function invalidateAll() {
    void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    void queryClient.invalidateQueries({ queryKey: ["summary"] });
    void queryClient.invalidateQueries({ queryKey: ["categories"] });
  }

  const createMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: invalidateAll,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TransactionInput }) =>
      updateTransaction(id, input),
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: invalidateAll,
  });

  return {
    transactions: transactionsQuery.data ?? [],
    summary: summaryQuery.data,
    categories: categoriesQuery.data ?? [],
    isLoading:
      transactionsQuery.isPending ||
      summaryQuery.isPending ||
      categoriesQuery.isPending,
    isError:
      transactionsQuery.isError ||
      summaryQuery.isError ||
      categoriesQuery.isError,
    error:
      transactionsQuery.error ??
      summaryQuery.error ??
      categoriesQuery.error ??
      null,
    isFetching:
      transactionsQuery.isFetching ||
      summaryQuery.isFetching ||
      categoriesQuery.isFetching,
    refetchAll: () => {
      void transactionsQuery.refetch();
      void summaryQuery.refetch();
      void categoriesQuery.refetch();
    },
    create: (input) => createMutation.mutateAsync(input),
    update: (args) => updateMutation.mutateAsync(args),
    remove: (id) => deleteMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
