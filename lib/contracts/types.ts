export type ContractRow = {
  id: string;
  accountNumber: string;
  supplierName: string;
  orderNo: string;
  contact: string;
  date: string;
  endDate: string;
  amount: string;
  note: string;
  status: string;
};

export type ContractSortKey =
  | "id"
  | "accountNumber"
  | "supplierName"
  | "orderNo"
  | "contact"
  | "date"
  | "endDate"
  | "amount"
  | "note";

export const CONTRACTS_STORAGE_KEY = "garmonik-contracts-v1";
