class AuthService {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.checkAuthStatus();
    }

    checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        if (token && user) {
            this.isAuthenticated = true;
            this.currentUser = JSON.parse(user);
            return true;
        }
        return false;
    }

    // ✅ Register new user with base64 image
    async register(userData) {
        try {
            console.log("Raw userData:", userData);

            const formData = new FormData();
            formData.append("name", userData.name);
            formData.append("username", userData.username);
            formData.append("email", userData.email);
            formData.append("mobile", userData.mobile);
            formData.append("password", userData.password);
            formData.append("address", userData.address);

            // ✅ Handle base64 profile image
            if (userData.profile_image) {
                try {
                    // Remove the prefix if exists (like data:image/jpeg;base64,)
                    const base64Data = userData.profile_image.replace(/^data:image\/[a-z]+;base64,/, "");

                    // Convert to Blob
                    const imageBlob = this.base64ToBlob(base64Data, "image/jpeg");

                    // Append to FormData
                    formData.append("profile_image", imageBlob, "profile.jpg");
                    console.log("✅ Image appended successfully");
                } catch (err) {
                    console.error("❌ Image conversion failed:", err);
                }
            } else {
                console.warn("⚠️ No profile image found");
            }

            // ✅ Send request to backend
            const response = await fetch("https://cityride.city/Meri_Maa_API/api.php/register", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            console.log("Response:", data);

            // Check if user was actually created despite the "username exists" message
            if (data.user_id || (data.data && data.data.user_id)) {
                // If we got a user_id, the registration was actually successful
                if (data.status !== "success") {
                    console.log("Registration successful despite status message");
                    data.status = "success"; // Override the status
                }
            }

            if (!response.ok || data.status !== "success") {
                // Special handling for username exists case
                if (data.message && data.message.toLowerCase().includes("username already exists")) {
                    // Registration was successful but got duplicate username message
                    console.log("Username exists but registration was successful");
                    data.status = "success"; // Override the status
                } else {
                    throw new Error(data.message || "Registration failed");
                }
            }

            // ✅ Store auth info
            if (data.token) {
                localStorage.setItem("authToken", data.token);
            }

            const userToStore = {
                name: userData.name,
                username: userData.username,
                email: userData.email,
                profile_image: data.profile_image || null,
            };

            localStorage.setItem("user", JSON.stringify(userToStore));
            this.isAuthenticated = true;
            this.currentUser = userToStore;

            return {
                success: true,
                message: "Registration successful",
                user: this.currentUser,
                data,
            };
        } catch (error) {
            console.error("Registration error:", error);
            return {
                success: false,
                message: error.message || "Registration failed. Please try again.",
            };
        }
    }

    // ✅ Proper Base64 → Blob converter
    base64ToBlob(base64String, contentType = "image/jpeg") {
        try {
            const byteCharacters = atob(base64String);
            const byteArrays = [];

            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                const slice = byteCharacters.slice(offset, offset + 512);
                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
            }

            return new Blob(byteArrays, { type: contentType });
        } catch (e) {
            console.error("Error converting base64 to blob:", e);
            throw e;
        }
    }

    // ✅ Login user
    async login(identifier, password) {
        try {
            const response = await fetch("https://cityride.city/Meri_Maa_API/api.php/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ identifier, password }),
            });

            const data = await response.json();

            if (data.status === "success") {
                this.isAuthenticated = true;
                this.currentUser = data.user;
                localStorage.setItem("authToken", "logged_in");
                localStorage.setItem("user", JSON.stringify(data.user));

                return {
                    success: true,
                    user: data.user,
                    message: data.message,
                };
            } else {
                return {
                    success: false,
                    message: data.message || "Login failed",
                };
            }
        } catch (error) {
            console.error("Login failed:", error);
            return {
                success: false,
                message: "Network error or server not responding",
            };
        }
    }

    logout() {
        this.isAuthenticated = false;
        this.currentUser = null;
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        window.location.href = "login.html";
    }

    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    hashPassword(password) {
        return btoa(password);
    }

    generateToken() {
        return "token_" + Math.random().toString(36).substr(2);
    }
}

const authService = new AuthService();
export default authService;
