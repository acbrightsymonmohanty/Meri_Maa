class AuthService {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.checkAuthStatus();
    }

    // Check if user is already logged in
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

    // Register new user
    async register(userData) {
        try {
            console.log('Raw userData:', userData); // Debug log

            // Prepare the request data as JSON
            const requestData = {
                name: userData.name,
                username: userData.username,
                email: userData.email,
                mobile: userData.mobile,
                password: userData.password,
                address: userData.address,
                profile_image: userData.profile_image || ''
            };

            console.log('Formatted request data:', requestData); // Debug log
            
            // If profile_image is a base64 string, convert it to a blob
            if (userData.profile_image) {
                try {
                    const imageBlob = this.base64ToBlob(userData.profile_image);
                    formData.append('profile_image', imageBlob, 'profile.jpg');
                } catch (e) {
                    console.error('Error converting image:', e);
                    formData.append('profile_image', userData.profile_image);
                }
            }

            console.log('Sending registration data...'); // Debug log

            const response = await fetch('https://cityride.city/Meri_Maa_API/api.php/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            console.log('Response status:', response.status); // Debug log

            const data = await response.json();
            console.log('Response data:', data); // Debug log

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            // Store user data and token if provided in response
            if (data.token) {
                localStorage.setItem('authToken', data.token);
            }
            
            const userToStore = {
                name: userData.name,
                username: userData.username,
                email: userData.email
            };
            
            localStorage.setItem('user', JSON.stringify(userToStore));
            this.isAuthenticated = true;
            this.currentUser = userToStore;

            return {
                success: true,
                message: 'Registration successful',
                user: this.currentUser,
                data: data // Include the API response data
            };

        } catch (error) {
            console.error('Registration error:', error); // Debug log
            return {
                success: false,
                message: error.message || 'Registration failed. Please try again.'
            };
        }
    }

    // Helper method to convert base64 to Blob
    base64ToBlob(base64String, contentType = 'image/jpeg') {
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
            console.error('Error converting base64 to blob:', e);
            throw e;
        }
    }

    // Login user using API
    async login(identifier, password) {
        try {
            const response = await fetch('https://cityride.city/Meri_Maa_API/api.php/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identifier: identifier,
                    password: password
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                this.isAuthenticated = true;
                this.currentUser = data.user;
                
                // Store user data and authentication state
                localStorage.setItem('authToken', 'logged_in'); // You might get a real token from the API
                localStorage.setItem('user', JSON.stringify(data.user));
                
                return {
                    success: true,
                    user: data.user,
                    message: data.message
                };
            } else {
                return {
                    success: false,
                    message: data.message || 'Login failed'
                };
            }
        } catch (error) {
            console.error('Login failed:', error);
            return {
                success: false,
                message: 'Network error or server not responding'
            };
        }
    }

    // Logout user
    logout() {
        this.isAuthenticated = false;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }

    // Check if user is authenticated
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    // Simple password hashing (for demo purposes only - use proper hashing in production)
    hashPassword(password) {
        return btoa(password); // This is NOT secure, just for demo
    }

    // Generate simple token (for demo purposes only)
    generateToken() {
        return 'token_' + Math.random().toString(36).substr(2);
    }
}

const authService = new AuthService();
export default authService;