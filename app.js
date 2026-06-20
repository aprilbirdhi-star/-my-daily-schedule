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
      
      if (currentMinutes >= startMin && currentMinutes < endMin) {
        if (!item.classList.contains('active')) {
          item.classList.add('active');
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
  
  document.getElementById('timer-display').textContent = 
    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
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
  
  const labelEl = document.getElementById('timer-state-label');
  if (mode === 'focus') {
    labelEl.textContent = '집중하세요!';
  } else if (mode === 'short') {
    labelEl.textContent = '시동 거는 중! 5분만!';
  } else if (mode === 'long') {
    labelEl.textContent = '편안히 쉬세요!';
  }
  
  document.getElementById('btn-start').textContent = '시작';
  
  const modeButtons = document.querySelectorAll('.btn-mode');
  modeButtons.forEach(btn => btn.classList.remove('active'));
  
  if (event && event.target) {
    event.target.classList.add('active');
  }
  
  updateTimerUI();
}

function toggleTimer() {
  const btnStart = document.getElementById('btn-start');
  
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    btnStart.textContent = '시작';
  } else {
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
  setTimerMode(5, 'short');
  if (!timerRunning) {
    toggleTimer();
  }
  alert('행동을 아주 잘게 쪼개어 시동을 겁니다. 5분만 해봐요! 💪');
}

// 3. Routine Progress Checklist
let routineStates = {};
let routineMemos = {};

function injectMemoUI() {
  const timelineItems = document.querySelectorAll('.timeline-item');
  
  timelineItems.forEach(item => {
    const id = item.id;
    
    // 1. Inject Memo toggle button in timeline-action
    const actionEl = item.querySelector('.timeline-action');
    if (actionEl && !actionEl.querySelector('.btn-memo-toggle')) {
      const btn = document.createElement('button');
      btn.className = 'btn-memo-toggle';
      btn.id = `memo-btn-${id}`;
      btn.innerHTML = '✏️';
      btn.title = '활동 메모 기록';
      btn.onclick = (e) => {
        e.preventDefault();
        toggleMemoContainer(id);
      };
      actionEl.insertBefore(btn, actionEl.firstChild);
    }
    
    // 2. Inject Memo Container at the end of timeline-item
    if (!item.querySelector('.timeline-memo-container')) {
      const container = document.createElement('div');
      container.className = 'timeline-memo-container';
      container.id = `memo-container-${id}`;
      container.innerHTML = `
        <input type="text" class="timeline-memo-input" id="memo-input-${id}" 
               placeholder="이 시간에 대신 무엇을 하셨나요? 기록해 보세요." 
               onchange="saveMemo('${id}')">
      `;
      item.appendChild(container);
    }
  });
}

function loadRoutines() {
  const saved = localStorage.getItem('routineStates');
  if (saved) {
    routineStates = JSON.parse(saved);
  }
  
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

// 4. Timeline Memos Logic
function loadMemos() {
  const saved = localStorage.getItem('routineMemos');
  if (saved) {
    routineMemos = JSON.parse(saved);
  }
  
  Object.keys(routineMemos).forEach(id => {
    const memoText = routineMemos[id];
    const input = document.getElementById(`memo-input-${id}`);
    if (input) {
      input.value = memoText;
    }
    updateMemoIndicator(id, memoText);
  });
}

function toggleMemoContainer(id) {
  const container = document.getElementById(`memo-container-${id}`);
  if (container) {
    container.classList.toggle('open');
  }
}

function saveMemo(id) {
  const input = document.getElementById(`memo-input-${id}`);
  if (!input) return;
  
  const text = input.value.trim();
  if (text) {
    routineMemos[id] = text;
  } else {
    delete routineMemos[id];
  }
  
  localStorage.setItem('routineMemos', JSON.stringify(routineMemos));
  updateMemoIndicator(id, text);
}

function updateMemoIndicator(id, text) {
  const item = document.getElementById(id);
  const btn = document.getElementById(`memo-btn-${id}`);
  
  if (!item) return;
  
  // Remove existing indicator
  const existingIndicator = item.querySelector('.timeline-memo-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  if (text) {
    if (btn) btn.classList.add('has-memo');
    
    // Create indicator badge
    const contentEl = item.querySelector('.timeline-content');
    if (contentEl) {
      const indicator = document.createElement('div');
      indicator.className = 'timeline-memo-indicator';
      indicator.innerHTML = `📝 대신 한 일: ${text}`;
      contentEl.appendChild(indicator);
    }
  } else {
    if (btn) btn.classList.remove('has-memo');
  }
}

// 5. Core Task Widget logic (Max 3 Tasks)
let coreTasks = [];

function loadCoreTasks() {
  const saved = localStorage.getItem('coreTasks');
  if (saved) {
    coreTasks = JSON.parse(saved);
  } else {
    // Migrate old coreTask if exists
    const oldSaved = localStorage.getItem('coreTask');
    if (oldSaved) {
      const oldTask = JSON.parse(oldSaved);
      coreTasks = [oldTask];
      localStorage.removeItem('coreTask');
      localStorage.setItem('coreTasks', JSON.stringify(coreTasks));
    }
  }
  renderCoreTasks();
}

function addCoreTask() {
  if (coreTasks.length >= 3) {
    alert('오늘의 주요 할 일은 최대 3개까지만 등록할 수 있습니다. 가장 중요한 일 3개에 집중해 보세요!');
    return;
  }
  
  const input = document.getElementById('core-task-input');
  const text = input.value.trim();
  
  if (!text) return;
  
  coreTasks.push({
    text: text,
    completed: false
  });
  
  localStorage.setItem('coreTasks', JSON.stringify(coreTasks));
  input.value = '';
  renderCoreTasks();
  updateOverallProgress();
}

function deleteCoreTask(index) {
  coreTasks.splice(index, 1);
  localStorage.setItem('coreTasks', JSON.stringify(coreTasks));
  renderCoreTasks();
  updateOverallProgress();
}

function toggleCoreTask(index) {
  if (coreTasks[index]) {
    coreTasks[index].completed = !coreTasks[index].completed;
    localStorage.setItem('coreTasks', JSON.stringify(coreTasks));
    renderCoreTasks();
    updateOverallProgress();
  }
}

function renderCoreTasks() {
  const container = document.getElementById('core-task-list');
  container.innerHTML = '';
  
  // Update register button state
  const btnAdd = document.querySelector('.btn-add');
  const input = document.getElementById('core-task-input');
  if (coreTasks.length >= 3) {
    if (btnAdd) btnAdd.disabled = true;
    if (input) input.placeholder = '할 일 3개 등록 완료!';
  } else {
    if (btnAdd) btnAdd.disabled = false;
    if (input) input.placeholder = `핵심 업무 입력 (최대 3개, 현재 ${coreTasks.length}/3)`;
  }
  
  if (coreTasks.length === 0) {
    container.innerHTML = `<li style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 1rem;">등록된 오늘 핵심 업무가 없습니다. (최대 3개)</li>`;
    return;
  }
  
  coreTasks.forEach((task, index) => {
    const li = document.createElement('li');
    li.className = `core-task-item ${task.completed ? 'completed' : ''}`;
    li.innerHTML = `
      <label class="core-task-checkbox">
        <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleCoreTask(${index})">
        <span class="custom-checkbox"></span>
        <span>${task.text}</span>
      </label>
      <button class="btn-delete" onclick="deleteCoreTask(${index})">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    `;
    container.appendChild(li);
  });
}

// 6. Overall Day Progress Calculator
function updateOverallProgress() {
  const totalRoutines = 13;
  const checkedRoutines = Object.values(routineStates).filter(Boolean).length;
  
  // Weighted progress
  const coreTaskWeight = 3;
  let totalScoreMax = totalRoutines;
  let currentScore = checkedRoutines;
  
  // Calculate based on up to 3 core tasks
  coreTasks.forEach(task => {
    totalScoreMax += coreTaskWeight;
    if (task.completed) {
      currentScore += coreTaskWeight;
    }
  });
  
  const percent = totalScoreMax > 0 ? Math.round((currentScore / totalScoreMax) * 100) : 0;
  
  const progressBar = document.getElementById('routine-progress');
  const progressPercentText = document.getElementById('progress-percent');
  
  if (progressBar) progressBar.style.width = `${percent}%`;
  if (progressPercentText) progressPercentText.textContent = `${percent}%`;
}

// Initialize on Load
window.addEventListener('DOMContentLoaded', () => {
  setInterval(updateClock, 1000);
  updateClock();
  
  // Inject Memo buttons & inputs
  injectMemoUI();
  
  const circleProgress = document.getElementById('timer-progress');
  if (circleProgress) circleProgress.style.strokeDashoffset = 502;
  
  loadRoutines();
  loadMemos();
  loadCoreTasks();

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('Service Worker Registered Successfully'))
      .catch((err) => console.error('Service Worker Registration Failed', err));
  }
});
