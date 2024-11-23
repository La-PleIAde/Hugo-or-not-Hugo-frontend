const API_BASE_URL = 'https://web-production-ee52.up.railway.app/api/v1/participant';

let participantId = null;
let questions = [];
let currentQuestionIndex = 0;
let selectedChoice = null;

// Check if the page is already in progress (after reload)
document.addEventListener('DOMContentLoaded', async () => {
    const savedState = JSON.parse(localStorage.getItem('quizProgress'));

    // If there's saved progress, load it
    if (savedState && savedState.participantId) {
        participantId = savedState.participantId;
        questions = await fetchQuestions(participantId);
        currentQuestionIndex = savedState.currentQuestionIndex;
        selectedChoice = savedState.selectedChoice;

        // Show the quiz page and load the saved progress
        document.getElementById('welcome-page').style.display = 'none';
        document.getElementById('quiz-page').style.display = 'block';
        loadQuestion();
    } else {
        // No progress, show the welcome page
        document.getElementById('welcome-page').style.display = 'block';
        document.getElementById('quiz-page').style.display = 'none';
    }
});

// Clear localStorage when the browser window or tab is closed
window.addEventListener('beforeunload', () => {
    localStorage.removeItem('quizProgress');
});

// Fetch questionnaire data from API
async function fetchQuestions(participantId) {
    const response = await fetch(`${API_BASE_URL}/questionnaire/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: participantId }),
    });
    const data = await response.json();
    return data.questions;
}

// Welcome Page Form Submission
document.getElementById('participant-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const age = document.getElementById('age').value;
    const education = document.getElementById('education').value;
    const familiarity = document.getElementById('familiarity').value;
    const studied = document.querySelector('input[name="studied"]:checked').value === 'true'; // Get the true/false value

    // Create participant
    const response = await fetch(`${API_BASE_URL}/participants/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            age,
            education,
            hugo_style_familiarity: familiarity,
            studied_french_literature: studied,
        }),
    });
    const data = await response.json();
    participantId = data.id;

    // Fetch questionnaire
    questions = await fetchQuestions(participantId);

    // Update total questions
    document.getElementById('total-questions').textContent = questions.length;

    // Show quiz page
    document.getElementById('welcome-page').style.display = 'none';
    document.getElementById('quiz-page').style.display = 'block';

    // Scroll to the top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Save progress in localStorage
    saveProgress();
    loadQuestion();
});

// Load a question
function loadQuestion() {
    const question = questions[currentQuestionIndex];
    document.getElementById('current-question').textContent = currentQuestionIndex + 1;
    document.getElementById('total-questions').textContent = questions.length;
    document.getElementById('question-category').textContent = `Catégorie : ${question.category}`;
    document.getElementById('left-text').textContent = question.left;
    document.getElementById('right-text').textContent = question.right;

    // Reset the selection before loading a new question
    document.querySelectorAll('.text-block').forEach(block => block.classList.remove('selected'));
    selectedChoice = null;
    document.getElementById('next-btn').disabled = true; // Disable the button until a choice is made
}

// Save progress to localStorage
function saveProgress() {
    const progress = {
        participantId,
        currentQuestionIndex,
        selectedChoice
    };
    localStorage.setItem('quizProgress', JSON.stringify(progress));
}

// Handle selection of a text block
document.querySelectorAll('.text-block').forEach(block => {
    block.addEventListener('click', () => {
        // Toggle selection on click
        document.querySelectorAll('.text-block').forEach(b => b.classList.remove('selected')); // Remove previous selection
        block.classList.add('selected'); // Mark the selected block
        selectedChoice = block.id === 'left-text' ? 'left' : 'right'; // Save the selected choice
        document.getElementById('next-btn').disabled = false; // Enable the button once a choice is made
    });
});

// Next Question Button
document.getElementById('next-btn').addEventListener('click', async () => {
    if (selectedChoice) {
        // Submit answer
        await fetch(`${API_BASE_URL}/answers/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question_id: questions[currentQuestionIndex].id,
                participant_id: participantId,
                choice: selectedChoice,
            }),
        });

        // Save progress before moving to the next question
        saveProgress();

        // Scroll to the top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Go to next question or finish
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
            loadQuestion();
        } else {
            document.getElementById('quiz-page').style.display = 'none';
            document.getElementById('thank-you-page').style.display = 'block';
            // Clear progress from localStorage after quiz completion
            localStorage.removeItem('quizProgress');
        }
    }
});

document.getElementById('return-btn').addEventListener('click', () => {
    document.getElementById('thank-you-page').style.display = 'none';
    document.getElementById('welcome-page').style.display = 'block';
    location.reload();
});

document.getElementById('share-btn').addEventListener('click', async () => {
    const shareUrl = window.location.href;
    try {
        // Copy the link to the clipboard
        await navigator.clipboard.writeText(shareUrl);

        // Show visual confirmation
        const shareBtn = document.getElementById('share-btn');
        shareBtn.textContent = 'Lien copié !';
        shareBtn.classList.add('btn-success', 'animate__animated', 'animate__pulse');

        // Revert to the original state after 2 seconds
        setTimeout(() => {
            shareBtn.textContent = 'Partager ce quiz';
            shareBtn.classList.remove('btn-success', 'animate__animated', 'animate__pulse');
        }, 2000);
    } catch (err) {
        console.error('Clipboard copy failed:', err);
        alert('Impossible de copier le lien. Veuillez essayer manuellement.');
    }
});
