const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8006";

// ─── Cookie helper ────────────────────────────────────────────────────────────
function getCookie(name: string): string {
    const v = `; ${document.cookie}`;
    const parts = v.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()!.split(";").shift() ?? "";
    return "";
}

// ─── CSRF ─────────────────────────────────────────────────────────────────────
// Call this before any state-mutating POST so Django sets the csrftoken cookie.
export async function fetchCsrf(): Promise<void> {
    await fetch(`${API}/auth/csrf/`, {
        credentials: "include",
    });
}

// ─── Sign In ──────────────────────────────────────────────────────────────────
export interface SignInData {
    email: string;
    password: string;
}

export interface AuthUser {
    username: string;
    email: string;
    name: string;
}

export async function signIn(data: SignInData): Promise<AuthUser> {
    await fetchCsrf();

    const res = await fetch(`${API}/auth/login/`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({ email: data.email, password: data.password }),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Login failed. Please check your credentials.");
    }

    const body = await res.json();
    return body.user as AuthUser;
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
    await fetch(`${API}/auth/logout/`, {
        method: "POST",
        credentials: "include",
        headers: {
            "X-CSRFToken": getCookie("csrftoken"),
        },
    });
}

// ─── Session Check ────────────────────────────────────────────────────────────
// Returns the current user if logged in, or null if not authenticated.
export async function getSession(): Promise<AuthUser | null> {
    const res = await fetch(`${API}/auth/session/`, {
        credentials: "include",
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.user as AuthUser;
}

// ─── Change Password ──────────────────────────────────────────────────────────
export interface ChangePasswordData {
    old_password: string;
    new_password: string;
}

export async function changePassword(data: ChangePasswordData): Promise<void> {
    // Ensure csrftoken is present even after hard refresh or expired browser cookies.
    await fetchCsrf();

    const res = await fetch(`${API}/auth/change-password/`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
            throw new Error(body.error ?? "Session expired. Please sign in again.");
        }
        throw new Error(body.error ?? "Failed to update password.");
    }
}

// ─── Forgot / Reset / OTP ─────────────────────────────────────────────────────
// TODO: wire these to real backend endpoints when the email-OTP flow is built.
// Currently stubs so the UI pages compile and can be navigated.

export async function forgotPassword(data: { email: string }): Promise<void> {
    // Placeholder — will POST to /auth/forgot-password/ once the endpoint exists
    console.log("[forgotPassword] stub called with:", data);
}

export async function verifyOTP(code: string): Promise<void> {
    // Placeholder — will POST to /auth/verify-otp/ once the endpoint exists
    console.log("[verifyOTP] stub called with:", code);
}

export async function resetPassword(data: { password: string; confirmPassword: string }): Promise<void> {
    // Placeholder — will POST to /auth/reset-password/ once the endpoint exists
    console.log("[resetPassword] stub called with:", data);
}

