export type AccountType = "participant" | "coach" | "organization";

export type FormErrors = Partial<Record<keyof SignupForm, string>>;

export type SignupForm = {
name: string;
email: string;
phone: string;
accountType: AccountType;
organizationName: string;
password: string;
confirmPassword: string;
};