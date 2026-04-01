export type FormErrors = Partial<Record<keyof SignupForm, string>>;

export type SignupForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};
