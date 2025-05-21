function toggleWeek(weekNumber) {
    const weekContainer = document.getElementById(`week${weekNumber}`);
    weekContainer.classList.toggle('active');
}