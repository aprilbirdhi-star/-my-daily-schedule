// State variables
let timerInterval = null;
let timerSecondsLeft = 25 * 60;
let timerTotalDuration = 25 * 60;
let timerRunning = false;

// Audio context or synthesized beep fallback for alarm
function playCompletionSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    
    oscillator.start();
    
    // Play a dual tone beep
    setTimeout(() => {
      oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      setTimeout(() => {
        oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime); // G5
        setTimeout(() => {
          oscillator.stop();
        }, 150);
      }, 150);
    }, 150);
  } catch (e) {
    console.log("Audio play blocked or unsupported:", e);
  }
}

// 1. Clock and Date updates
function updateClock() {
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  document.getElementById('current-date').textContent = now.toLocaleDateString('ko-KR', options);
  
  const timeString = now.toTimeString().split(' ')[0];
  document.getElementById('current-time').textContent = timeString;
  
  // Update timeline highlights every second/minute
  updateActiveTimelineItem(now);
}

// Parse "HH:MM" into minutes of the day
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Highlight current task based on system time
function updateActiveTimelineItem(now) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const timelineItems = document.querySelectorAll('.timeline-item');
  
  timelineItems.forEach(item => {
    const startStr = item.getAttribute('data-start');
    const endStr = item.getAttribute('data-end');
    
    if (startStr && endStr) {
      const startMin = timeToMinutes(startStr);
      const endMin = timeToMinutes(endStr);
      
      // Handle overnight if needed, but here it's 07:00 to 22:00
      if (currentMinutes >= startMin && currentMinutes < endMin) {
        if (!item.classList.contains('active')) {
          item.classList.add('active');
          // Smooth scroll to active item
          item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } else {
        item.classList.remove('active');
      }
    }
  });
}

// 2. Pomodoro Timer implementation
function updateTimerUI() {
  const minutes = Math.floor(timerSecondsLeft / 60);
  const seconds = timerSecondsLeft % 60;
  
  // Format display
  document.getElementById('timer-display').textContent = 
    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  // Draw Circle progress (perimeter is 502)
  const circleProgress = document.getElementById('timer-progress');
  const fraction = timerSecondsLeft / timerTotalDuration;
  const offset = 502 * (1 - fraction);
  circleProgress.style.strokeDashoffset = offset;
}

function setTimerMode(minutes, mode) {
  clearInterval(timerInterval);
  timerRunning = false;
  timerTotalDuration = minutes * 60;
  timerSecondsLeft = timerTotalDuration;
  
  // Update labels
  const labelEl = document.getElementById('timer-state-label');
  if (mode === 'focus') {
    labelEl.textContent = '집중하세요!';
  } else if (mode === 'short') {
    labelEl.textContent = '시동 거는 중! 5분만!';
  } else if (mode === 'long') {
    labelEl.textContent = '편안히 쉬세요!';
  }
  
  document.getElementById('btn-start').textContent = '시작';
  
  // Handle active mode buttons
  const modeButtons = document.querySelectorAll('.btn-mode');
  modeButtons.forEach(btn => btn.classList.remove('active'));
  
  // Find matching button
  event.target.classList.add('active');
  
  updateTimerUI();
}

function toggleTimer() {
  const btnStart = document.getElementById('btn-start');
  
  if (timerRunning) {
    // Pause
    clearInterval(timerInterval);
    timerRunning = false;
    btnStart.textContent = '시작';
  } else {
    // Start
    timerRunning = true;
    btnStart.textContent = '일시정지';
    
    timerInterval = setInterval(() => {
      if (timerSecondsLeft > 0) {
        timerSecondsLeft--;
        updateTimerUI();
      } else {
        clearInterval(timerInterval);
        timerRunning = false;
        btnStart.textContent = '시작';
        playCompletionSound();
        alert('시간이 다 되었습니다! 수고하셨습니다. 🎉');
        resetTimer();
      }
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerSecondsLeft = timerTotalDuration;
  document.getElementById('btn-start').textContent = '시작';
  updateTimerUI();
}

function startQuickFiveMinutes() {
  // Switch mode to 5 minutes
  const shortModeBtn = document.querySelector('.btn-mode[onclick*="5, \'short\'"]');
  if (shortModeBtn) {
    shortModeBtn.click();
  } else {
    setTimerMode(5, 'short');
  }
  
  // Start the timer
  if (!timerRunning) {
    toggleTimer();
  }
  
  // Alert motivational message
  alert('행동을 아주 잘게 쪼개어 시동을 겁니다. 5분만 해봐요! 💪');
}

// 3. Routine Progress Checklist
let routineStates = {};

function loadRoutines() {
  const saved = localStorage.getItem('routineStates');
  if (saved) {
    routineStates = JSON.parse(saved);
  }
  
  // Apply saved state to DOM elements
  Object.keys(routineStates).forEach(id => {
    const item = document.getElementById(id);
    if (item) {
      const checkbox = item.querySelector('.timeline-checkbox input');
      if (checkbox) {
        checkbox.checked = routineStates[id];
        if (routineStates[id]) {
          item.classList.add('completed');
        } else {
          item.classList.remove('completed');
        }
      }
    }
  });
  
  updateOverallProgress();
}

function toggleRoutine(id) {
  const item = document.getElementById(id);
  const checkbox = item.querySelector('.timeline-checkbox input');
  
  routineStates[id] = checkbox.checked;
  
  if (checkbox.checked) {
    item.classList.add('completed');
  } else {
    item.classList.remove('completed');
  }
  
  localStorage.setItem('routineStates', JSON.stringify(routineStates));
  updateOverallProgress();
}

// 4. Core Task Widget logic
let coreTask = null;

function loadCoreTask() {
  const saved = localStorage.getItem('coreTask');
  if (saved) {
    coreTask = JSON.parse(saved);
    renderCoreTask();
  }
}

function addCoreTask() {
  const input = document.getElementById('core-task-input');
  const text = input.value.trim();
  
  if (!text) return;
  
  coreTask = {
    text: text,
    completed: false
  };
  
  localStorage.setItem('coreTask', JSON.stringify(coreTask));
  input.value = '';
  renderCoreTask();
  updateOverallProgress();
}

function deleteCoreTask() {
  coreTask = null;
  localStorage.removeItem('coreTask');
  renderCoreTask();
  updateOverallProgress();
}

function toggleCoreTask() {
  if (coreTask) {
    coreTask.completed = !coreTask.completed;
    localStorage.setItem('coreTask', JSON.stringify(coreTask));
    renderCoreTask();
    updateOverallProgress();
  }
}

function renderCoreTask() {
  const container = document.getElementById('core-task-list');
  container.innerHTML = '';
  
  if (!coreTask) {
    container.innerHTML = `<li style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 1rem;">등록된 오늘 핵심 업무가 없습니다.</li>`;
    return;
  }
  
  const li = document.createElement('li');
  li.className = `core-task-item ${coreTask.completed ? 'completed' : ''}`;
  li.innerHTML = `
    <label class="core-task-checkbox">
      <input type="checkbox" ${coreTask.completed ? 'checked' : ''} onchange="toggleCoreTask()">
      <span class="custom-checkbox"></span>
      <span>${coreTask.text}</span>
    </label>
    <button class="btn-delete" onclick="deleteCoreTask()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
    </button>
  `;
  container.appendChild(li);
}

// 5. Overall Day Progress Calculator
function updateOverallProgress() {
  const totalRoutines = 13; // Number of items in schedule
  const checkedRoutines = Object.values(routineStates).filter(Boolean).length;
  
  // Calculate weighted progress
  // Core task has weight of 3 routine items
  const coreTaskWeight = 3;
  let totalScoreMax = totalRoutines;
  let currentScore = checkedRoutines;
  
  if (coreTask) {
    totalScoreMax += coreTaskWeight;
    if (coreTask.completed) {
      currentScore += coreTaskWeight;
    }
  }
  
  const percent = totalScoreMax > 0 ? Math.round((currentScore / totalScoreMax) * 100) : 0;
  
  const progressBar = document.getElementById('routine-progress');
  const progressPercentText = document.getElementById('progress-percent');
  
  progressBar.style.width = `${percent}%`;
  progressPercentText.textContent = `${percent}%`;
}

// Initialize on Load
window.addEventListener('DOMContentLoaded', () => {
  setInterval(updateClock, 1000);
  updateClock();
  
  // Timer circular background setting
  const circleProgress = document.getElementById('timer-progress');
  circleProgress.style.strokeDashoffset = 502; // Init dashoffset
  
  loadRoutines();
  loadCoreTask();

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('Service Worker Registered Successfully'))
      .catch((err) => console.error('Service Worker Registration Failed', err));
  }
});
