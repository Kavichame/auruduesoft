document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Countdown Timer (April 4, 2026) ---
    const countdownEl = document.getElementById('countdown');
    const targetDate = new Date('April 4, 2026 09:00:00').getTime();

    const updateCountdown = () => {
        const now = new Date().getTime();
        const distance = targetDate - now;

        if (distance < 0) {
            countdownEl.innerHTML = "Event Started!";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        countdownEl.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    };
    setInterval(updateCountdown, 1000);
    updateCountdown();

    // --- 2. Tab Switching Logic ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked button
            btn.classList.add('active');

            // Show corresponding content
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // --- 3. Ticket Cost Calculation ---
    const ticketTypeSelect = document.getElementById('ticketType');
    const quantityInput = document.getElementById('quantity');
    const totalDisplay = document.getElementById('totalDisplay');

    const calculateTotal = () => {
        const price = parseInt(ticketTypeSelect.value);
        const quantity = parseInt(quantityInput.value);
        
        if(quantity < 1 || isNaN(quantity)) {
            totalDisplay.textContent = "LKR 0";
            return;
        }
        totalDisplay.textContent = `LKR ${price * quantity}`;
    };

    ticketTypeSelect.addEventListener('change', calculateTotal);
    quantityInput.addEventListener('input', calculateTotal);

    // --- 4. Form Submission Logic (Shared Modal) ---
    const modal = document.getElementById('successModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const closeBtn = document.querySelector('.close-btn');

    // Ticket Form Submit
    document.getElementById('registrationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = {
            fullName: form.fullName.value,
            email: form.email.value,
            phone: form.phone.value,
            ticketType: form.ticketType.options[form.ticketType.selectedIndex].text,
            quantity: form.quantity.value
        };

        try {
            const response = await fetch('http://localhost:3000/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const result = await response.json();
            if (response.ok) {
                modalTitle.textContent = "සුබ අලුත් අවුරුද්දක් වේවා! 🌻";
                modalMessage.textContent = result.message;
                form.reset();
                calculateTotal();
            } else {
                modalTitle.textContent = "Error!";
                modalMessage.textContent = result.message || "Registration failed.";
            }
        } catch (error) {
            modalTitle.textContent = "Connection Error";
            modalMessage.textContent = "Could not connect to the server.";
        } finally {
            modal.style.display = "flex";
        }
    });

    // Contest Form Submit
    document.getElementById('contestForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        
        const formData = new FormData();
        formData.append('contestantName', form.cName.value);
        formData.append('age', form.cAge.value);
        formData.append('category', form.cCategory.value);
        formData.append('whatsappNumber', form.cPhone.value);
        if (form.cPhoto.files[0]) {
            formData.append('photo', form.cPhoto.files[0]);
        }

        try {
            const response = await fetch('http://localhost:3000/api/contest', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();
            if (response.ok) {
                modalTitle.textContent = "Good Luck! 👑";
                modalMessage.textContent = result.message;
                form.reset();
            } else {
                modalTitle.textContent = "Error!";
                modalMessage.textContent = result.message || "Registration failed.";
            }
        } catch (error) {
            modalTitle.textContent = "Connection Error";
            modalMessage.textContent = "Could not connect to the server.";
        } finally {
            modal.style.display = "flex";
        }
    });

    // Close Modal
    closeBtn.onclick = () => { modal.style.display = "none"; }
    window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; }
});
