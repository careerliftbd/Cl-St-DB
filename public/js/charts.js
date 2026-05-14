document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
        // ব্যাকএন্ড থেকে সব স্টুডেন্টের ডাটা ফেচ করা
        const response = await fetch('/api/students', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success) {
            const students = result.data;
            processAndRenderDashboard(students);
        }
    } catch (error) {
        console.error("Dashboard Data Fetch Error:", error);
    }
});

function processAndRenderDashboard(students) {
    // ১. কাউন্টার প্রসেসিং
    const total = students.length;
    const running = students.filter(s => s.admissionInfo?.courseStatus === 'Running').length;
    const completed = students.filter(s => s.admissionInfo?.courseStatus === 'Completed').length;
    const dropped = students.filter(s => s.admissionInfo?.courseStatus === 'Dropped').length;
    const suspended = students.filter(s => s.admissionInfo?.courseStatus === 'Suspended').length;
    
    const hotVisa = students.filter(s => s.careerProfile?.visaPriority === 'Hot').length;

    // DOM-এ কাউন্টার বসানো
    document.getElementById('totalCount').innerText = total;
    document.getElementById('runningCount').innerText = running;
    document.getElementById('alumniCount').innerText = completed;
    document.getElementById('hotVisaCount').innerText = hotVisa;

    // ২. স্ট্যাটাস চার্ট (Doughnut)
    const ctxStatus = document.getElementById('statusChart').getContext('2d');
    new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Running', 'Completed', 'Dropped', 'Suspended'],
            datasets: [{
                data: [running, completed, dropped, suspended],
                backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // ৩. ক্যারিয়ার গোল চার্ট (Bar Chart)
    const goalsMap = {};
    students.forEach(s => {
        const goal = s.careerProfile?.careerGoal;
        if (goal) {
            goalsMap[goal] = (goalsMap[goal] || 0) + 1;
        }
    });

    const ctxGoal = document.getElementById('goalChart').getContext('2d');
    new Chart(ctxGoal, {
        type: 'bar',
        data: {
            labels: Object.keys(goalsMap),
            datasets: [{
                label: 'Students Count',
                data: Object.values(goalsMap),
                backgroundColor: '#3b82f6',
                borderRadius: 6
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // ۴. পেইড বনাম ফ্রি চার্ট (Pie)
    const paid = students.filter(s => s.admissionInfo?.courseType === 'Paid').length;
    const free = students.filter(s => s.admissionInfo?.courseType === 'Free').length;

    const ctxFinance = document.getElementById('financeChart').getContext('2d');
    new Chart(ctxFinance, {
        type: 'pie',
        data: {
            labels: ['Paid Course', 'Free Course'],
            datasets: [{
                data: [paid, free],
                backgroundColor: ['#6366f1', '#a5b4fc']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}