document.addEventListener("DOMContentLoaded", () => {
    const calendarContainer = document.getElementById("calendar-container");
    const currentMonthDisplay = document.getElementById("current-month");
    const checkInSummary = document.getElementById("check-in-summary");
    const prevMonthButton = document.getElementById("prev-month");
    const nextMonthButton = document.getElementById("next-month");
    const yearlyCheckInSummary = document.getElementById("yearly-check-in-summary");

    let currentDate = new Date();
    const checkInData = new Set(JSON.parse(localStorage.getItem("checkInData")) || []);

    // Save check-in data to localStorage
    function saveCheckInData() {
        localStorage.setItem("checkInData", JSON.stringify(Array.from(checkInData)));
    }

    // Generate calendar for a specific year and month
    function generateCalendar(year, month) {
        calendarContainer.innerHTML = ""; // Clear previous calendar

        const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Adjust to start from Monday
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const calendarTable = document.createElement("table");
        calendarTable.classList.add("calendar");

        // Add header row with day names (starting from Monday)
        const headerRow = document.createElement("tr");
        ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach(day => {
            const th = document.createElement("th");
            th.textContent = day;
            headerRow.appendChild(th);
        });
        calendarTable.appendChild(headerRow);

        // Add days
        let date = 1;
        for (let i = 0; i < 6; i++) { // Maximum 6 rows
            const row = document.createElement("tr");

            for (let j = 0; j < 7; j++) {
                const cell = document.createElement("td");

                if (i === 0 && j < firstDay) {
                    // Empty cells before the first day
                    cell.textContent = "";
                } else if (date > daysInMonth) {
                    // Empty cells after the last day
                    cell.textContent = "";
                } else {
                    // Add date
                    cell.textContent = date;
                    cell.dataset.date = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
                    cell.classList.add("calendar-day");

                    // Highlight if already checked in
                    if (checkInData.has(cell.dataset.date)) {
                        cell.classList.add("checked-in");
                    }

                    // Add click event for check-in
                    cell.addEventListener("click", () => toggleCheckIn(cell));

                    date++;
                }

                row.appendChild(cell);
            }

            calendarTable.appendChild(row);

            if (date > daysInMonth) break; // Stop if all days are added
        }

        calendarContainer.appendChild(calendarTable);

        // Update current month display
        updateCurrentMonthDisplay();

        // Update check-in summary
        updateCheckInSummary(year, month);
    }

    // Toggle check-in for a date
    function toggleCheckIn(cell) {
        const date = cell.dataset.date;

        if (checkInData.has(date)) {
            checkInData.delete(date);
            cell.classList.remove("checked-in");
        } else {
            checkInData.add(date);
            cell.classList.add("checked-in");
        }

        // Save updated data to localStorage
        saveCheckInData();

        // Update check-in summary
        const [year, month] = date.split("-").map(Number);
        updateCheckInSummary(year, month - 1);
    }

    // Update yearly check-in summary
    function updateYearlyCheckInSummary() {
        const currentYear = currentDate.getFullYear();
        const yearlyCheckedInDays = Array.from(checkInData).filter(date => {
            const [y] = date.split("-").map(Number);
            return y === currentYear;
        }).length;

        yearlyCheckInSummary.textContent = `${currentYear}年：${yearlyCheckedInDays}`;
    }

    // Update check-in summary
    function updateCheckInSummary(year, month) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const checkedInDays = Array.from(checkInData).filter(date => {
            const [y, m] = date.split("-").map(Number);
            return y === year && m === month + 1;
        }).length;

        checkInSummary.textContent = `本月：${checkedInDays} / ${daysInMonth}`;

        // Update yearly check-in summary
        updateYearlyCheckInSummary();
    }

    // Update the current month display
    function updateCurrentMonthDisplay() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1; // Months are zero-based
        currentMonthDisplay.textContent = `${year}年 ${month}月`;
    }

    // Handle month navigation
    prevMonthButton.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
    });

    nextMonthButton.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
    });

    // Generate the calendar for the current month
    generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
});