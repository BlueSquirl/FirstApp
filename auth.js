// Mock authentication + subscription layer.
// TODO: Replace with Firebase Auth.

(() => {
  const USERS_KEY = "cm_users";
  const CURRENT_USER_KEY = "cm_current_user_id";
  const authListeners = new Set();
  let currentUser = null;
  let authMode = "login";

  const elements = {
    loginBtn: document.getElementById("loginBtn"),
    signupBtn: document.getElementById("signupBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    userEmail: document.getElementById("userEmail"),
    premiumBadge: document.getElementById("premiumBadge"),
    authModal: document.getElementById("authModal"),
    authTitle: document.getElementById("authTitle"),
    authSubtitle: document.getElementById("authSubtitle"),
    loginForm: document.getElementById("loginForm"),
    signupForm: document.getElementById("signupForm"),
    loginEmail: document.getElementById("loginEmail"),
    signupEmail: document.getElementById("signupEmail"),
    loginError: document.getElementById("loginError"),
    signupError: document.getElementById("signupError"),
    upgradeModal: document.getElementById("upgradeModal"),
    upgradeNowBtn: document.getElementById("upgradeNowBtn"),
    upgradeLoginBtn: document.getElementById("upgradeLoginBtn"),
    upgradeCloseBtn: document.getElementById("upgradeCloseBtn"),
    upgradeBackdrop: document.getElementById("upgradeBackdrop"),
    subscriptionStatus: document.getElementById("subscriptionStatus"),
    upgradeBtn: document.getElementById("upgradeBtn"),
    devPanel: document.getElementById("devPanel"),
    devUserSelect: document.getElementById("devUserSelect"),
    devLoginBtn: document.getElementById("devLoginBtn"),
    devNewUserEmail: document.getElementById("devNewUserEmail"),
    devCreateUserBtn: document.getElementById("devCreateUserBtn"),
    devToggleSubBtn: document.getElementById("devToggleSubBtn"),
    devSubStatus: document.getElementById("devSubStatus"),
    devClearStorageBtn: document.getElementById("devClearStorageBtn"),
    devCloseBtn: document.getElementById("devCloseBtn"),
  };

  function notifyAuthChange() {
    authListeners.forEach((listener) => listener(currentUser));
    window.dispatchEvent(
      new CustomEvent("auth:change", { detail: { user: currentUser } })
    );
  }

  function generateUserId() {
    if (window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint8Array(6);
      window.crypto.getRandomValues(bytes);
      return `user_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
    }
    return `user_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  }

  function normalizeEmail(value) {
    return value.trim().toLowerCase();
  }

  function loadUsers() {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function updateUser(updatedUser) {
    const users = loadUsers().map((user) =>
      user.userId === updatedUser.userId ? updatedUser : user
    );
    saveUsers(users);
    if (currentUser && currentUser.userId === updatedUser.userId) {
      currentUser = updatedUser;
    }
  }

  function setCurrentUser(user) {
    currentUser = user;
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, user.userId);
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    updateAuthUI();
    notifyAuthChange();
  }

  function getCurrentUser() {
    return currentUser;
  }

  function checkSubscriptionStatus() {
    return currentUser?.subscriptionTier || "free";
  }

  function isUserSubscribed() {
    return checkSubscriptionStatus() === "premium";
  }

  function updateSubscriptionTier(tier) {
    if (!currentUser) {
      return;
    }
    const nextUser = {
      ...currentUser,
      isSubscribed: tier === "premium",
      subscriptionTier: tier,
    };
    updateUser(nextUser);
    setCurrentUser(nextUser);
  }

  function requirePremium() {
    if (!currentUser) {
      openAuthModal("signup");
      return false;
    }
    if (isUserSubscribed()) {
      return true;
    }
    openUpgradeModal();
    return false;
  }

  function setFormError(target, message) {
    target.textContent = message;
    target.classList.toggle("hidden", !message);
  }

  function updateAuthUI() {
    const isLoggedIn = Boolean(currentUser);
    const isPremium = isUserSubscribed();
    elements.loginBtn.classList.toggle("hidden", isLoggedIn);
    elements.signupBtn.classList.toggle("hidden", isLoggedIn);
    elements.logoutBtn.classList.toggle("hidden", !isLoggedIn);
    elements.userEmail.classList.toggle("hidden", !isLoggedIn);
    elements.premiumBadge.classList.toggle("hidden", !isLoggedIn || !isPremium);
    elements.upgradeLoginBtn.classList.toggle("hidden", isLoggedIn);
    elements.userEmail.textContent = isLoggedIn ? currentUser.email : "";
    elements.subscriptionStatus.textContent = isPremium ? "Premium" : "Free";
    elements.upgradeBtn.classList.toggle("hidden", isPremium);
    refreshDevPanel();
  }

  function setAuthMode(mode) {
    authMode = mode;
    const isLogin = mode === "login";
    elements.loginForm.classList.toggle("hidden", !isLogin);
    elements.signupForm.classList.toggle("hidden", isLogin);
    elements.authTitle.textContent = isLogin ? "Welcome back" : "Create your account";
    elements.authSubtitle.textContent = isLogin
      ? "Log in to save and track contracts."
      : "Create a profile to favorite and track bids.";
    setFormError(elements.loginError, "");
    setFormError(elements.signupError, "");
  }

  function openAuthModal(mode) {
    setAuthMode(mode);
    elements.authModal.classList.remove("hidden");
    elements.authModal.setAttribute("aria-hidden", "false");
  }

  function closeAuthModal() {
    elements.authModal.classList.add("hidden");
    elements.authModal.setAttribute("aria-hidden", "true");
  }

  function openUpgradeModal() {
    elements.upgradeModal.classList.remove("hidden");
    elements.upgradeModal.setAttribute("aria-hidden", "false");
  }

  function closeUpgradeModal() {
    elements.upgradeModal.classList.add("hidden");
    elements.upgradeModal.setAttribute("aria-hidden", "true");
  }

  function handleUpgradeNow() {
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }
    updateSubscriptionTier("premium");
    closeUpgradeModal();
  }

  function refreshDevPanel() {
    if (!elements.devPanel) {
      return;
    }
    const users = loadUsers();
    elements.devUserSelect.innerHTML = users
      .map((user) => `<option value="${user.userId}">${user.email}</option>`)
      .join("");

    if (currentUser) {
      elements.devUserSelect.value = currentUser.userId;
      elements.devSubStatus.textContent = `Current: ${checkSubscriptionStatus()}`;
    } else {
      elements.devSubStatus.textContent = "Current: none";
    }
  }

  function toggleDevPanel() {
    elements.devPanel.classList.toggle("hidden");
    refreshDevPanel();
  }

  function handleLogin(email) {
    const users = loadUsers();
    const user = users.find((entry) => entry.email === email);
    if (!user) {
      return { ok: false, message: "No account found for that email." };
    }
    setCurrentUser(user);
    return { ok: true };
  }

  function handleSignup(email) {
    const users = loadUsers();
    if (users.some((entry) => entry.email === email)) {
      return { ok: false, message: "Account already exists. Log in instead." };
    }

    const newUser = {
      userId: generateUserId(),
      email,
      isSubscribed: false,
      subscriptionTier: "free",
    };
    users.push(newUser);
    saveUsers(users);
    setCurrentUser(newUser);
    return { ok: true };
  }

  function initAuth() {
    const users = loadUsers();
    const currentId = localStorage.getItem(CURRENT_USER_KEY);
    const storedUser = users.find((user) => user.userId === currentId) || null;
    setCurrentUser(storedUser);

    elements.loginBtn.addEventListener("click", () => openAuthModal("login"));
    elements.signupBtn.addEventListener("click", () => openAuthModal("signup"));
    elements.logoutBtn.addEventListener("click", () => setCurrentUser(null));
    elements.upgradeBtn.addEventListener("click", openUpgradeModal);

    elements.authModal.addEventListener("click", (event) => {
      const actionElement = event.target.closest("[data-action]");
      if (!actionElement) {
        return;
      }
      const { action, mode } = actionElement.dataset;
      if (action === "close") {
        closeAuthModal();
      }
      if (action === "switch") {
        openAuthModal(mode === "signup" ? "signup" : "login");
      }
    });

    elements.upgradeNowBtn.addEventListener("click", handleUpgradeNow);
    elements.upgradeLoginBtn.addEventListener("click", () => openAuthModal("signup"));
    elements.upgradeCloseBtn.addEventListener("click", closeUpgradeModal);
    elements.upgradeBackdrop.addEventListener("click", closeUpgradeModal);

    elements.loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = normalizeEmail(elements.loginEmail.value);
      if (!email) {
        setFormError(elements.loginError, "Enter your email to log in.");
        return;
      }
      const result = handleLogin(email);
      if (!result.ok) {
        setFormError(elements.loginError, result.message);
        return;
      }
      setFormError(elements.loginError, "");
      closeAuthModal();
    });

    elements.signupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = normalizeEmail(elements.signupEmail.value);
      if (!email) {
        setFormError(elements.signupError, "Enter your email to create an account.");
        return;
      }
      const result = handleSignup(email);
      if (!result.ok) {
        setFormError(elements.signupError, result.message);
        return;
      }
      setFormError(elements.signupError, "");
      closeAuthModal();
    });

    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") {
        toggleDevPanel();
      }
    });

    if (elements.devPanel) {
      elements.devCloseBtn.addEventListener("click", () => {
        elements.devPanel.classList.add("hidden");
      });
      elements.devLoginBtn.addEventListener("click", () => {
        const userId = elements.devUserSelect.value;
        const user = loadUsers().find((entry) => entry.userId === userId);
        if (user) {
          setCurrentUser(user);
        }
      });
      elements.devCreateUserBtn.addEventListener("click", () => {
        const email = normalizeEmail(elements.devNewUserEmail.value);
        if (!email) {
          return;
        }
        handleSignup(email);
        elements.devNewUserEmail.value = "";
        refreshDevPanel();
      });
      elements.devToggleSubBtn.addEventListener("click", () => {
        if (!currentUser) {
          return;
        }
        const nextTier = isUserSubscribed() ? "free" : "premium";
        updateSubscriptionTier(nextTier);
        refreshDevPanel();
      });
      elements.devClearStorageBtn.addEventListener("click", () => {
        localStorage.clear();
        setCurrentUser(null);
        refreshDevPanel();
      });
    }
  }

  window.Auth = {
    initAuth,
    getCurrentUser,
    checkSubscriptionStatus,
    isUserSubscribed,
    requirePremium,
    openUpgradeModal,
    onAuthChange: (listener) => authListeners.add(listener),
    updateSubscriptionTier,
    loadUsers,
  };
})();
