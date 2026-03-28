export type SignUpDto = {
  email: string;
  fullName: string;
  phone?: string;
  password: string;
  billingInfo?: boolean;
};

export type SignInDto = {
  email: string;
  password: string;
};

export type JwtResponse = {
  token: string;
};
