type AccountType = "participant" | "coach" | "organization";

type FormErrors = Partial<Record<keyof SignupForm, string>>;

type SignupForm = {
name: string;
email: string;
phone: string;
accountType: AccountType;
organizationName: string;
password: string;
confirmPassword: string;
};

export const validateInput = (data: SignupForm): FormErrors => {
    const next: FormErrors = {};

    if (!data.name.trim()) next.name = "First Name is required.";

    if (!data.email.trim()) next.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(data.email))
    next.email = "Please enter a valid email.";

    if (!data.phone.trim()) next.phone = "Phone is required.";

    if (data.accountType === "organization" && !data.organizationName.trim()) {
    next.organizationName = "School / Club name is required.";
    }

    if (!data.password) next.password = "Password is required.";
    else if (data.password.length < 8)
    next.password = "Password must be at least 8 characters.";

    if (!data.confirmPassword)
    next.confirmPassword = "Please confirm your password.";
    else if (data.confirmPassword !== data.password)
    next.confirmPassword = "Passwords do not match.";

    return next;
};