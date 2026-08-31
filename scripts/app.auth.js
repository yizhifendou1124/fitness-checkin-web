document.addEventListener("DOMContentLoaded", () => {
    // ---------- Supabase 客户端 ----------
    const supabase = window.supabase.createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey
    );

    // ---------- DOM 元素 ----------
    const appContainer = document.getElementById("app");
    const authContainer = document.getElementById("auth-container");
    const authModeFixed = document.getElementById("auth-mode-fixed");
    const authModeEmail = document.getElementById("auth-mode-email");
    const authStepFixed = document.getElementById("auth-step-fixed");
    const authStepEmail = document.getElementById("auth-step-email");
    const authStepOtp = document.getElementById("auth-step-otp");
    const authEmail = document.getElementById("auth-email");
    const authPassword = document.getElementById("auth-password");
    const authOtp = document.getElementById("auth-otp");
    const authMessage = document.getElementById("auth-message");
    const fixedLoginButton = document.getElementById("fixed-login");
    const sendOtpButton = document.getElementById("send-otp");
    const verifyOtpButton = document.getElementById("verify-otp");
    const backToEmailButton = document.getElementById("back-to-email");
    const userEmail = document.getElementById("user-email");
    const openMigrationButton = document.getElementById("open-migration");
    const logoutButton = document.getElementById("logout");

    const calendarContainer = document.getElementById("calendar-container");
    const currentMonthDisplay = document.getElementById("current-month");
    const checkInSummary = document.getElementById("check-in-summary");
    const prevMonthButton = document.getElementById("prev-month");
    const nextMonthButton = document.getElementById("next-month");
    const yearlyCheckInSummary = document.getElementById("yearly-check-in-summary");
    const migrationModal = document.getElementById("migration-modal");
    const closeMigrationButton = document.getElementById("close-migration");
    const migrationCurrentAccount = document.getElementById("migration-current-account");
    const migrationSourceEmail = document.getElementById("migration-source-email");
    const migrateDataButton = document.getElementById("migrate-data");
    const migrationMessage = document.getElementById("migration-message");

    let currentDate = new Date();
    let currentUser = null;
    const checkInData = new Set();

    // ================= 认证 =================

    function showAuthMessage(msg, type) {
        authMessage.textContent = msg;
        authMessage.className = type;
    }

    function showMigrationMessage(msg, type) {
        migrationMessage.textContent = msg;
        migrationMessage.className = type;
    }

    function getMigrationMode() {
        const selected = document.querySelector('input[name="migration-mode"]:checked');
        return selected ? selected.value : "incremental";
    }

    function openMigrationModal() {
        migrationModal.classList.remove("hidden");
        showMigrationMessage("", "");
        migrationSourceEmail.focus();
    }

    function closeMigrationModal() {
        migrationModal.classList.add("hidden");
        showMigrationMessage("", "");
    }

    function showAuthLoading(msg) {
        appContainer.classList.add("hidden");
        authContainer.classList.remove("hidden");
        authStepFixed.classList.add("hidden");
        authStepEmail.classList.add("hidden");
        authStepOtp.classList.add("hidden");
        showAuthMessage(msg, "success");
    }

    function setAuthMode(mode) {
        const isFixedMode = mode === "fixed";
        authModeFixed.classList.toggle("active", isFixedMode);
        authModeEmail.classList.toggle("active", !isFixedMode);
        authModeFixed.setAttribute("aria-pressed", String(isFixedMode));
        authModeEmail.setAttribute("aria-pressed", String(!isFixedMode));
        authStepFixed.classList.toggle("hidden", !isFixedMode);
        authStepEmail.classList.toggle("hidden", isFixedMode);
        authStepOtp.classList.add("hidden");
        authOtp.value = "";
        showAuthMessage("", "");
    }

    async function signInFixedUser() {
        const password = authPassword.value.trim();
        if (!password) {
            showAuthMessage("请输入密码", "error");
            return;
        }

        fixedLoginButton.disabled = true;
        const { error } = await supabase.auth.signInWithPassword(
            window.buildPasswordSignInPayload(SUPABASE_CONFIG.fixedLoginEmail, password)
        );
        fixedLoginButton.disabled = false;

        if (error) {
            showAuthMessage("登录失败：" + error.message, "error");
        }
    }

    // 发送邮箱验证码
    async function sendOtp() {
        const email = authEmail.value.trim();
        if (!email) {
            showAuthMessage("请输入邮箱地址", "error");
            return;
        }
        sendOtpButton.disabled = true;
        const { error } = await supabase.auth.signInWithOtp(
            window.buildOtpSignInPayload(email, SUPABASE_CONFIG, window.location)
        );
        sendOtpButton.disabled = false;
        if (error) {
            showAuthMessage("发送失败：" + error.message, "error");
        } else {
            showAuthMessage("验证码已发送到 " + email + "。为迁移本机旧数据，建议在此页面输入邮件中的验证码；也可以点邮件链接登录。", "success");
            authStepEmail.classList.add("hidden");
            authStepOtp.classList.remove("hidden");
        }
    }

    // 校验验证码
    async function verifyOtp() {
        const email = authEmail.value.trim();
        const token = authOtp.value.trim();
        if (!email || !token) {
            showAuthMessage("请输入邮箱和验证码", "error");
            return;
        }
        verifyOtpButton.disabled = true;
        const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
        verifyOtpButton.disabled = false;
        if (error) {
            showAuthMessage("验证失败：" + error.message, "error");
        }
        // 成功后 onAuthStateChange 会自动进入主界面
    }

    async function handleSignedIn(user) {
        currentUser = user;
        appContainer.classList.remove("hidden");
        authContainer.classList.add("hidden");
        userEmail.textContent = user.email;
        migrationCurrentAccount.textContent = user.email || "";
        await loadCloudData();
        generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
    }

    function handleSignedOut() {
        currentUser = null;
        checkInData.clear();
        appContainer.classList.add("hidden");
        authContainer.classList.remove("hidden");
        setAuthMode("fixed");
        authStepOtp.classList.add("hidden");
        authOtp.value = "";
        authPassword.value = "";
        migrationSourceEmail.value = "";
        migrationCurrentAccount.textContent = "";
        closeMigrationModal();
        showMigrationMessage("", "");
        showAuthMessage("", "");
    }

    async function migrateData() {
        const sourceEmail = migrationSourceEmail.value.trim();
        const targetEmail = currentUser && currentUser.email ? currentUser.email : "";
        const migrationMode = getMigrationMode();

        if (!sourceEmail) {
            showMigrationMessage("请输入 Source 账号", "error");
            return;
        }

        if (!targetEmail) {
            showMigrationMessage("当前账号邮箱不存在，请重新登录后再试", "error");
            return;
        }

        if (migrationMode === "overwrite" && !window.confirm("全量覆盖会先清空 To 账号当前打卡数据，再复制 Source 账号数据。确认继续？")) {
            return;
        }

        migrateDataButton.disabled = true;
        showMigrationMessage("正在迁移...", "success");

        const { data, error } = await supabase.rpc("copy_checkins_between_emails", {
            source_email: sourceEmail,
            target_email: targetEmail,
            migration_mode: migrationMode,
        });

        migrateDataButton.disabled = false;

        if (error) {
            showMigrationMessage("迁移失败：" + error.message, "error");
            return;
        }

        const result = Array.isArray(data) ? data[0] : data;
        const copiedCount = result ? result.copied_count : 0;
        const targetAfterCount = result ? result.target_after_count : 0;
        const actionText = migrationMode === "overwrite" ? "全量覆盖" : "增量复制";

        showMigrationMessage(`${actionText}完成：新增 ${copiedCount} 条，To 账号当前共 ${targetAfterCount} 条。`, "success");

        if (currentUser.email && targetEmail.toLowerCase() === currentUser.email.toLowerCase()) {
            await loadCloudData();
            generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
        }
    }

    // ================= 数据同步 =================

    // 从云端加载打卡数据，并自动迁移 localStorage 里的旧数据
    async function loadCloudData() {
        const userId = currentUser.id;

        const { data, error } = await supabase
            .from("checkins")
            .select("date")
            .eq("user_id", userId);

        if (error) {
            console.error("加载云端数据失败：", error);
            alert("加载数据失败，请刷新重试：\n" + error.message);
            return;
        }

        checkInData.clear();
        data.forEach((row) => checkInData.add(row.date));

        // 迁移 localStorage 里的旧打卡记录（首次登录时）
        const local = JSON.parse(localStorage.getItem("checkInData")) || [];
        const newDates = local.filter((d) => !checkInData.has(d));
        if (newDates.length > 0) {
            const rows = newDates.map((date) => ({ user_id: userId, date }));
            const { error: migrateError } = await supabase
                .from("checkins")
                .upsert(rows, { onConflict: "user_id,date" });
            if (!migrateError) {
                newDates.forEach((d) => checkInData.add(d));
                localStorage.removeItem("checkInData");
            } else {
                console.error("迁移旧数据失败：", migrateError);
            }
        }
    }

    // 同步单条打卡到云端，返回错误对象（成功为 null）
    async function syncCheckIn(date, checked) {
        const { error } = checked
            ? await supabase.from("checkins").upsert(
                { user_id: currentUser.id, date },
                { onConflict: "user_id,date" }
            )
            : await supabase
                .from("checkins")
                .delete()
                .eq("user_id", currentUser.id)
                .eq("date", date);
        return error;
    }

    // ================= 日历渲染 =================

    function generateCalendar(year, month) {
        calendarContainer.innerHTML = "";

        const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // 周一开始
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const calendarTable = document.createElement("table");
        calendarTable.classList.add("calendar");

        const headerRow = document.createElement("tr");
        ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach(day => {
            const th = document.createElement("th");
            th.textContent = day;
            headerRow.appendChild(th);
        });
        calendarTable.appendChild(headerRow);

        let date = 1;
        for (let i = 0; i < 6; i++) {
            const row = document.createElement("tr");

            for (let j = 0; j < 7; j++) {
                const cell = document.createElement("td");

                if (i === 0 && j < firstDay) {
                    cell.textContent = "";
                } else if (date > daysInMonth) {
                    cell.textContent = "";
                } else {
                    cell.textContent = date;
                    cell.dataset.date = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
                    cell.classList.add("calendar-day");

                    if (checkInData.has(cell.dataset.date)) {
                        cell.classList.add("checked-in");
                    }

                    cell.addEventListener("click", () => toggleCheckIn(cell));

                    date++;
                }

                row.appendChild(cell);
            }

            calendarTable.appendChild(row);

            if (date > daysInMonth) break;
        }

        calendarContainer.appendChild(calendarTable);

        updateCurrentMonthDisplay();
        updateCheckInSummary(year, month);
    }

    // 切换某天的打卡状态（先同步云端，成功后再更新界面）
    async function toggleCheckIn(cell) {
        const date = cell.dataset.date;
        const willCheckIn = !checkInData.has(date);

        const error = await syncCheckIn(date, willCheckIn);
        if (error) {
            alert("同步失败，请检查网络后重试：\n" + error.message);
            return;
        }

        if (willCheckIn) {
            checkInData.add(date);
            cell.classList.add("checked-in");
        } else {
            checkInData.delete(date);
            cell.classList.remove("checked-in");
        }

        const [year, month] = date.split("-").map(Number);
        updateCheckInSummary(year, month - 1);
    }

    function updateYearlyCheckInSummary() {
        const currentYear = currentDate.getFullYear();
        const yearlyCheckedInDays = Array.from(checkInData).filter(date => {
            const [y] = date.split("-").map(Number);
            return y === currentYear;
        }).length;

        yearlyCheckInSummary.textContent = `${currentYear}年：${yearlyCheckedInDays}`;
    }

    function updateCheckInSummary(year, month) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const checkedInDays = Array.from(checkInData).filter(date => {
            const [y, m] = date.split("-").map(Number);
            return y === year && m === month + 1;
        }).length;

        checkInSummary.textContent = `本月：${checkedInDays} / ${daysInMonth}`;

        updateYearlyCheckInSummary();
    }

    function updateCurrentMonthDisplay() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        currentMonthDisplay.textContent = `${year}年 ${month}月`;
    }

    // ================= 事件绑定 =================

    authModeFixed.addEventListener("click", () => setAuthMode("fixed"));
    authModeEmail.addEventListener("click", () => setAuthMode("email"));
    fixedLoginButton.addEventListener("click", signInFixedUser);
    authPassword.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            signInFixedUser();
        }
    });
    sendOtpButton.addEventListener("click", sendOtp);
    verifyOtpButton.addEventListener("click", verifyOtp);

    backToEmailButton.addEventListener("click", () => {
        authStepOtp.classList.add("hidden");
        authStepEmail.classList.remove("hidden");
        authOtp.value = "";
        showAuthMessage("", "");
    });

    logoutButton.addEventListener("click", async () => {
        await supabase.auth.signOut();
    });

    openMigrationButton.addEventListener("click", openMigrationModal);
    closeMigrationButton.addEventListener("click", closeMigrationModal);
    migrationModal.addEventListener("click", (event) => {
        if (event.target === migrationModal) {
            closeMigrationModal();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !migrationModal.classList.contains("hidden")) {
            closeMigrationModal();
        }
    });
    migrateDataButton.addEventListener("click", migrateData);

    prevMonthButton.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
    });

    nextMonthButton.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
    });

    // ================= 初始化 =================

    async function init() {
        showAuthLoading("正在登录并同步数据...");

        const magicLinkSession = window.parseMagicLinkSessionFromHash(window.location.hash);
        if (magicLinkSession) {
            const { error } = await supabase.auth.setSession(magicLinkSession);
            if (error) {
                handleSignedOut();
                showAuthMessage("登录链接已失效，请重新发送验证码。", "error");
                return;
            }
            window.history.replaceState(null, "", window.location.pathname);
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await handleSignedIn(session.user);
        } else {
            handleSignedOut();
        }

        supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                handleSignedIn(session.user);
            } else {
                handleSignedOut();
            }
        });
    }

    init();
});
