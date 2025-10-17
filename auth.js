import authService from './authService.js';

// Redirect to login if not authenticated
function checkAuth() {
    // Get the current page name
    const currentPage = window.location.pathname.split('/').pop();
    
    // Skip auth check for login and register pages
    const authPages = ['login.html', 'register.html'];
    if (authPages.includes(currentPage)) {
        return;
    }
    
    // Check authentication for other pages
    if (!authService.isUserAuthenticated()) {
        window.location.href = 'login.html';
    }
}

// Check authentication on page load
checkAuth();

document.addEventListener('DOMContentLoaded', function() {
    // Prevent default form submission behavior
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
        });
    });
    // Form handling
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    // Handle login form submission and loading state
    if (loginForm) {
        const loginButton = loginForm.querySelector('.auth-submit-btn');
        
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Show loading state
            loginButton.classList.add('loading');
            const buttonText = loginButton.querySelector('span');
            const originalText = buttonText.textContent;
            buttonText.textContent = 'Logging in...';
            
            try {
                const identifier = document.getElementById('loginIdentifier').value;
                const password = document.getElementById('loginPassword').value;
                
                const result = await authService.login({
                    identifier: identifier,
                    password: password
                });
                
                if (result.success) {
                    window.location.href = 'index.html';
                }
            } catch (error) {
                console.error('Login error:', error);
            } finally {
                loginButton.classList.remove('loading');
                buttonText.textContent = originalText;
            }
        });
    }
    
    // Handle file input for profile image
    const profileImageInput = document.getElementById('profile_image');
    let profileImageBase64 = '';

    if (profileImageInput) {
        const preview = document.querySelector('.file-preview');
        profileImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    // Update preview
                    if (preview) {
                        preview.style.display = 'block';
                        preview.innerHTML = `<img src="${e.target.result}" alt="Profile Preview">`;
                    }
                    // Store base64 string for registration
                    profileImageBase64 = e.target.result.split(',')[1]; // Get base64 string without data:image prefix
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Simple data collection without validation
    function collectFormData(formData) {
        return [];
    }

    // Function to handle registration errors
    function showRegistrationError(message) {
        const errorDiv = document.getElementById('registrationError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    // Function to validate and update button states
    function updateRegisterButtonStates() {
        if (!registerForm) return;

        const formData = {
            name: document.getElementById('name')?.value || '',
            username: document.getElementById('username')?.value || '',
            email: document.getElementById('email')?.value || '',
            mobile: document.getElementById('mobile')?.value || '',
            password: document.getElementById('password')?.value || '',
            address: document.getElementById('address')?.value || ''
        };

        // Get buttons
        const signInButton = registerForm.querySelector('button[type="submit"]');
        const facebookButton = document.getElementById('facebookLoginBtn');

        // Check if all fields are filled and valid
        const isFormValid = 
            formData.name.length >= 2 &&
            formData.username.length >= 3 &&
            isValidEmail(formData.email) &&
            isValidMobile(formData.mobile) &&
            formData.password.length >= 6 &&
            formData.address.length > 0;

        // Update button states
        if (signInButton) {
            signInButton.disabled = !isFormValid;
            signInButton.classList.toggle('active', isFormValid);
        }

        if (facebookButton) {
            facebookButton.disabled = !isFormValid;
            facebookButton.classList.toggle('active', isFormValid);
        }
    }

    // Add input event listeners to all registration form fields
    if (registerForm) {
        const inputFields = ['name', 'username', 'email', 'mobile', 'password', 'address'];
        inputFields.forEach(fieldId => {
            const input = document.getElementById(fieldId);
            if (input) {
                input.addEventListener('input', updateRegisterButtonStates);
            }
        });

        // Also update on file input change
        if (profileImageInput) {
            profileImageInput.addEventListener('change', updateRegisterButtonStates);
        }

        // Handle registration form submission
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Trim all input values to remove any whitespace
            const formData = {
                name: document.getElementById('name').value.trim(),
                username: document.getElementById('username').value.trim(),
                email: document.getElementById('email').value.trim(),
                mobile: document.getElementById('mobile').value.trim(),
                password: document.getElementById('password').value,
                address: document.getElementById('address').value.trim(),
                profile_image: profileImageBase64 || ''
            };

            console.log('Form data before validation:', formData); // Debug log

            // Validate form data
            const errors = validateRegistrationForm(formData);
            if (errors.length > 0) {
                showRegistrationError(errors.join('\n'));
                return;
            }

            // Show loading state
            const submitButton = registerForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Registering...';

            try {
                const submitButton = registerForm.querySelector('button[type="submit"]');
                submitButton.textContent = 'Registering...';
                submitButton.disabled = true;

                console.log('Sending registration data:', formData); // Debug log

                const result = await authService.register(formData);
                console.log('Registration result:', result); // Debug log

                if (result.success) {
                    // Show success message
                    const successMessage = document.createElement('div');
                    successMessage.className = 'success-message';
                    successMessage.textContent = 'Registration successful! Redirecting...';
                    registerForm.insertBefore(successMessage, registerForm.firstChild);

                    // Wait for 2 seconds before redirecting
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                } else {
                    showRegistrationError(result.message);
                    submitButton.textContent = 'Sign Up';
                    submitButton.disabled = false;
                }
            } catch (error) {
                console.error('Registration error:', error); // Debug log
                showRegistrationError('Registration failed. Please try again.');
            } finally {
                // Reset button state
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }
    
    // Function to validate login form
    function validateLoginForm() {
        if (!loginForm) return;
        const identifier = document.getElementById('loginIdentifier');
        const password = document.getElementById('loginPassword');
        const submitBtn = loginForm.querySelector('.auth-submit-btn');
        
        if (identifier && password && submitBtn) {
            const isValid = identifier.value.trim().length > 0 && password.value.trim().length > 0;
            submitBtn.disabled = !isValid;
            submitBtn.classList.toggle('active', isValid);
        }
    }

    // Function to validate register form
    function validateRegisterForm() {
        if (!registerForm) return;
        const name = document.getElementById('name');
        const username = document.getElementById('username');
        const email = document.getElementById('email');
        const mobile = document.getElementById('mobile');
        const password = document.getElementById('password');
        const address = document.getElementById('address');
        const submitBtn = registerForm.querySelector('.auth-submit-btn');
        
        if (name && username && email && mobile && password && address && submitBtn) {
            const isValid = name.value.trim().length > 0 &&
                          username.value.trim().length > 0 &&
                          email.value.trim().length > 0 &&
                          mobile.value.trim().length > 0 &&
                          password.value.trim().length > 0 &&
                          address.value.trim().length > 0;
            
            submitBtn.disabled = !isValid;
            submitBtn.classList.toggle('active', isValid);
        }
    }
    
    // Add input event listeners to login form fields
    if (loginForm) {
        const loginInputs = loginForm.querySelectorAll('input');
        loginInputs.forEach(input => {
            input.addEventListener('input', validateLoginForm);
            // Trigger validation on page load
            validateLoginForm();
        });
    }

    // Add input event listeners to register form fields
    if (registerForm) {
        const registerInputs = registerForm.querySelectorAll('input');
        registerInputs.forEach(input => {
            input.addEventListener('input', validateRegisterForm);
            // Trigger validation on page load
            validateRegisterForm();
        });
    }
    
    // Password visibility toggle
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Profile image preview and handling
    if (profileImageInput) {
        profileImageInput.addEventListener('change', function(e) {
            const preview = document.querySelector('.file-preview');
            const file = e.target.files[0];

            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    // Update the preview if it exists
                    if (preview) {
                        preview.style.display = 'block';
                        preview.innerHTML = `<img src="${e.target.result}" alt="Profile Preview">`;
                    }
                    // Store base64 string for registration
                    profileImageBase64 = e.target.result.split(',')[1];
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('.auth-submit-btn');
            const identifier = document.getElementById('loginIdentifier').value;
            const password = document.getElementById('loginPassword').value;
            const errorDiv = document.querySelector('.error-message') || 
                           document.createElement('div');
            errorDiv.className = 'error-message';

            // Validate inputs
            if (!identifier || !password) {
                errorDiv.textContent = 'Please fill in all fields';
                if (!errorDiv.parentNode) {
                    this.insertBefore(errorDiv, this.firstChild);
                }
                return;
            }

            try {
                // Disable the submit button and show loading state
                submitBtn.disabled = true;
                submitBtn.textContent = 'Logging in...';

                // Attempt login
                const loginResult = await authService.login(identifier, password);

                if (loginResult.success) {
                    // Show success message briefly before redirect
                    errorDiv.style.color = '#00a0ff';
                    errorDiv.textContent = loginResult.message;
                    if (!errorDiv.parentNode) {
                        this.insertBefore(errorDiv, this.firstChild);
                    }

                    // Redirect after a short delay to show the success message
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                } else {
                    // Show error message
                    errorDiv.style.color = '#ed4956';
                    errorDiv.textContent = loginResult.message;
                    if (!errorDiv.parentNode) {
                        this.insertBefore(errorDiv, this.firstChild);
                    }
                    
                    // Re-enable the submit button
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Log in';
                }
            } catch (error) {
                // Handle any unexpected errors
                console.error('Login error:', error);
                errorDiv.textContent = 'An unexpected error occurred. Please try again.';
                if (!errorDiv.parentNode) {
                    this.insertBefore(errorDiv, this.firstChild);
                }
                
                // Re-enable the submit button
                submitBtn.disabled = false;
                submitBtn.textContent = 'Log in';
            }
        });
    }

    // Registration form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.classList.add('loading');
            }

            try {
                const formData = new FormData(this);
                const userData = {};
                
                // Convert FormData to object
                for (let [key, value] of formData.entries()) {
                    if (key === 'profile_image' && value instanceof File) {
                        if (value.size > 0) {
                            userData.profile_image = await new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result);
                                reader.readAsDataURL(value);
                            });
                        }
                        continue;
                    }
                    userData[key] = value;
                }

                const result = await authService.register(userData);
                if (result.success) {
                    window.location.href = 'index.html';
                }
            } catch (error) {
                console.error('Registration error:', error);
            } finally {
                if (submitBtn) {
                    submitBtn.classList.remove('loading');
                }
            }
            if (!validateRegistration(userData)) {
                return;
            }

            // Attempt registration
            if (await authService.register(userData)) {
                alert('Registration successful! Please log in.');
                window.location.href = 'login.html';
            } else {
                errorDiv.textContent = 'Registration failed. Please try again.';
                if (!errorDiv.parentNode) {
                    this.insertBefore(errorDiv, this.firstChild);
                }
            }
        });
    }
});

function validateRegistration(data) {
    // Username validation
    if (data.username.length < 3) {
        alert('Username must be at least 3 characters long');
        return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        alert('Please enter a valid email address');
        return false;
    }

    // Mobile validation
    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(data.mobile)) {
        alert('Please enter a valid 10-digit mobile number');
        return false;
    }

    // Password validation
    if (data.password.length < 6) {
        alert('Password must be at least 6 characters long');
        return false;
    }

    return true;
}