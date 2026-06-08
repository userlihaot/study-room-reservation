/* ============================================
   静思自习室预约管理系统 - 主逻辑脚本
   ============================================ */

'use strict';

// ==================== 常量 ====================
const TIME_SLOTS = [
    '08:00-10:00', '10:00-12:00', '14:00-16:00', '16:00-18:00', '19:00-21:00'
];

const STATUS_MAP = {
    'available': { label: '可用', cls: 'status-available', icon: 'fa-circle-check' },
    'reserved': { label: '已预约', cls: 'status-reserved', icon: 'fa-clock' },
    'in_use': { label: '使用中', cls: 'status-in_use', icon: 'fa-person' },
};

const RESV_STATUS_MAP = {
    'pending': { label: '待审核', cls: 'status-pending' },
    'approved': { label: '已通过', cls: 'status-approved' },
    'cancelled': { label: '已取消', cls: 'status-cancelled' },
    'completed': { label: '已完成', cls: 'status-completed' },
};

// ==================== Storage 模块 ====================
const Storage = {
    get(key) {
        try { return JSON.parse(localStorage.getItem(key)) || null; } catch(e) { return null; }
    },
    set(key, val) {
        localStorage.setItem(key, JSON.stringify(val));
    },
    remove(key) { localStorage.removeItem(key); }
};

// ==================== 当前登录会话 ====================
let currentUser = Storage.get('sr_current_user') || null; // {id, username, role}

function saveSession() { Storage.set('sr_current_user', currentUser); }
function clearSession() { currentUser = null; Storage.remove('sr_current_user'); }

// ==================== 数据初始化 ====================
function initDefaultData() {
    // 用户数据
    if (!Storage.get('sr_users')) {
        const users = [
            { id: 1, username: 'admin', password: '123456', role: 'admin', status: 'active', phone: '13800000000', createdAt: '2026-01-01' },
            { id: 2, username: 'testuser', password: '123456', role: 'user', status: 'active', phone: '13900000001', createdAt: '2026-06-01' },
        ];
        Storage.set('sr_users', users);
    }
    // 座位数据
    if (!Storage.get('sr_seats')) {
        const seats = [
            { id: 1, name: 'A01', location: '靠窗区', type: '靠窗座', status: 'available', description: '落地窗旁，采光极佳' },
            { id: 2, name: 'A02', location: '靠窗区', type: '靠窗座', status: 'reserved', description: '超大窗户，视野开阔' },
            { id: 3, name: 'B01', location: '安静区', type: '标准座', status: 'available', description: '独立隔间，绝对安静' },
            { id: 4, name: 'B02', location: '安静区', type: '标准座', status: 'available', description: '人体工学椅，舒适耐用' },
            { id: 5, name: 'B03', location: '安静区', type: '标准座', status: 'in_use', description: '双显示器支架配置' },
            { id: 6, name: 'C01', location: '讨论区', type: '双人座', status: 'available', description: '双人桌，适合小组学习' },
            { id: 7, name: 'C02', location: '讨论区', type: '卡座', status: 'available', description: '半包围卡座设计' },
            { id: 8, name: 'V01', location: 'VIP区', type: 'VIP座', status: 'available', description: '豪华真皮座椅，专属服务' },
            { id: 9, name: 'V02', location: 'VIP区', type: 'VIP座', status: 'available', description: '独立包厢，完全私密空间' },
            { id: 10, name: 'D01', location: '休闲区', type: '标准座', status: 'available', description: '靠近茶水间，方便取用饮品' },
        ];
        Storage.set('sr_seats', seats);
    }
    // 公告数据
    if (!Storage.get('sr_announcements')) {
        const anns = [
            { id: 1, title: '欢迎来到静思自习室', content: '新店开业期间全场8折优惠，欢迎新老同学前来体验！', date: '2026-06-01' },
            { id: 2, title: '暑期特惠活动', content: '即日起至8月31日，办理月卡享7折优惠，季卡享6折优惠，名额有限先到先得！', date: '2026-06-05' },
            { id: 3, title: '系统升级通知', content: '自习室预约系统已全面升级，即日起支持在线预约选座，请同学们互相转告。', date: '2026-06-07' },
        ];
        Storage.set('sr_announcements', anns);
    }
    // 设置数据
    if (!Storage.get('sr_settings')) {
        Storage.set('sr_settings', {
            siteName: '静思自习室',
            openTime: '08:00',
            closeTime: '22:00',
            priceStandard: '<p>标准座：<strong>5元/小时</strong> | 靠窗座：<strong>6元/小时</strong></p><p>VIP座：<strong>10元/小时</strong> | 双人座：<strong>8元/小时</strong></p><p>月卡：<strong>299元/月</strong>（不限时）| 季卡：<strong>799元/季</strong>（不限时）</p>',
        });
    }
    // 测试预约数据
    if (!Storage.get('sr_reservations')) {
        const today = new Date().toISOString().split('T')[0];
        const resvs = [
            { id: 1, userId: 2, seatId: 1, date: today, timeSlot: TIME_SLOTS[2], status: 'approved', createdAt: '2026-06-06 10:30' },
        ];
        Storage.set('sr_reservations', resvs);
    }
}

// ==================== 工具函数 ====================
function $(id) { return document.getElementById(id); }
function genId(arr) { return arr.length > 0 ? Math.max(...arr.map(x => x.id)) + 1 : 1; }
function todayStr() { return new Date().toISOString().split('T')[0]; }
function nowStr() {
    const d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+
           String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}

function getUserById(uid) { return Storage.get('sr_users')?.find(u => u.id === uid) || null; }
function getSeatById(sid) { return Storage.get('sr_seats')?.find(s => s.id === sid) || null; }

// ==================== Toast 提示 ====================
function showToast(msg, type = 'info') {
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
    const colors = { success: 'bg-success', error: 'bg-danger', info: 'bg-info', warning: 'bg-warning text-dark' };
    const container = $('toastContainer');
    const id = 'toast_' + Date.now();
    const html = `
        <div id="${id}" class="toast custom-toast ${colors[type]} text-white border-0" role="alert" data-bs-delay="3000">
            <div class="toast-body d-flex align-items-center">
                <i class="fas ${icons[type]} me-2"></i>${msg}
                <button type="button" class="btn-close btn-close-white ms-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
    const el = document.getElementById(id);
    const toast = new bootstrap.Toast(el, { delay: 3000 });
    toast.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
}

// ==================== 确认弹窗 ====================
function showConfirm(title, body, callback) {
    $('confirmModalTitle').textContent = title;
    $('confirmModalBody').textContent = body;
    const modal = new bootstrap.Modal($('confirmModal'));
    const btn = $('confirmModalBtn');
    const handler = () => { callback(); modal.hide(); btn.removeEventListener('click', handler); };
    btn.addEventListener('click', handler);
    modal.show();
}

// ==================== 导航系统 ====================
const VIEW_IDS = [
    'view-home', 'view-user-login', 'view-user-register', 'view-admin-login',
    'view-seats', 'view-reserve', 'view-my-reservations', 'view-profile',
    'view-admin-dashboard', 'view-admin-users', 'view-admin-seats', 'view-admin-reservations', 'view-admin-settings'
];

function navigate(view) {
    // 权限拦截
    const userRequired = ['seats', 'reserve', 'my-reservations', 'profile'];
    const adminRequired = ['admin-dashboard', 'admin-users', 'admin-seats', 'admin-reservations', 'admin-settings'];

    if (userRequired.includes(view) && !currentUser) {
        showToast('请先登录后再访问该页面', 'warning');
        navigate('user-login');
        return;
    }
    if (adminRequired.includes(view) && (!currentUser || currentUser.role !== 'admin')) {
        showToast('权限不足，请使用管理员账号登录', 'error');
        navigate('admin-login');
        return;
    }

    // 切换视图
    VIEW_IDS.forEach(vid => { const el = $(vid); if (el) el.classList.remove('active'); });
    const targetView = $('view-' + view);
    if (targetView) targetView.classList.add('active');

    // 更新导航栏
    updateNavbar(view);

    // 关闭移动端菜单
    const navCollapse = document.querySelector('.navbar-collapse');
    if (navCollapse && navCollapse.classList.contains('show')) {
        document.querySelector('.navbar-toggler')?.click();
    }

    // 渲染对应内容
    renderView(view);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateNavbar(activeView) {
    const navLinks = $('navLinks');
    let html = '';

    if (!currentUser) {
        // 未登录
        html = `
            <li class="nav-item"><a class="nav-link${activeView==='home'?' active':''}" href="#" onclick="navigate('home')"><i class="fas fa-home"></i>首页</a></li>
            <li class="nav-item"><a class="nav-link${activeView==='user-login'?' active':''}" href="#" onclick="navigate('user-login')"><i class="fas fa-sign-in-alt"></i>用户登录</a></li>
            <li class="nav-item"><a class="nav-link${activeView==='admin-login'?' active':''}" href="#" onclick="navigate('admin-login')"><i class="fas fa-user-shield"></i>管理员入口</a></li>`;
    } else if (currentUser.role === 'admin') {
        // 管理员
        html = `
            <li class="nav-item"><span class="user-badge admin-badge me-2"><i class="fas fa-crown"></i>管理员</span></li>
            <li class="nav-item"><a class="nav-link${activeView==='admin-dashboard'?' active':''}" href="#" onclick="navigate('admin-dashboard')"><i class="fas fa-tachometer-alt"></i>控制台</a></li>
            <li class="nav-item"><a class="nav-link${activeView==='admin-users'?' active':''}" href="#" onclick="navigate('admin-users')"><i class="fas fa-users"></i>用户管理</a></li>
            <li class="nav-item"><a class="nav-link${activeView==='admin-seats'?' active':''}" href="#" onclick="navigate('admin-seats')"><i class="fas fa-chair"></i>座位管理</a></li>
            <li class="nav-item"><a class="nav-link${activeView==='admin-reservations'?' active':''}" href="#" onclick="navigate('admin-reservations')"><i class="fas fa-calendar-alt"></i>预约管理</a></li>
            <li class="nav-item"><a class="nav-link${activeView==='admin-settings'?' active':''}" href="#" onclick="navigate('admin-settings')"><i class="fas fa-cog"></i>系统设置</a></li>
            <li class="nav-item"><a class="nav-link text-warning" href="#" onclick="adminLogout()"><i class="fas fa-sign-out-alt"></i>退出管理</a></li>`;
    } else {
        // 普通用户
        html = `
            <li class="nav-item"><span class="user-badge"><i class="fas fa-user"></i>${currentUser.username}</span></li>
            <li class="nav-item"><a class="nav-link${activeView==='home'?' active':''}" href="#" onclick="navigate('home')"><i class="fas fa-home"></i>首页</a></li>
            <li class="nav-item"><a class="nav-link${activeView==='seats'?' active':''}" href="#" onclick="navigate('seats')"><i class="fas fa-chair"></i>座位浏览</a></li>
            <li class="nav-item"><a class="nav-link${activeView==='reserve'?' active':''}" href="#" onclick="navigate('reserve')"><i class="fas fa-calendar-plus"></i>我要预约</a></li>
            <li class="nav-item"><a class="nav-link${activeView==='my-reservations'?' active':''}" href="#" onclick="navigate('my-reservations')"><i class="fas fa-list-check"></i>我的预约</a></li>
            <li class="nav-item"><a class="nav-link${activeView==='profile'?' active':''}" href="#" onclick="navigate('profile')"><i class="fas fa-id-card"></i>个人中心</a></li>
            <li class="nav-item"><a class="nav-link text-danger" href="#" onclick="userLogout()"><i class="fas fa-sign-out-alt"></i>退出</a></li>`;
    }
    navLinks.innerHTML = html;
}

function renderView(view) {
    switch(view) {
        case 'home': renderHome(); break;
        case 'seats': renderSeats(); break;
        case 'reserve': renderReserve(); break;
        case 'my-reservations': renderMyReservations(); break;
        case 'profile': renderProfile(); break;
        case 'admin-dashboard': renderAdminDashboard(); break;
        case 'admin-users': renderAdminUsers(); break;
        case 'admin-seats': renderAdminSeats(); break;
        case 'admin-reservations': renderAdminReservations(); break;
        case 'admin-settings': renderAdminSettings(); break;
    }
}

// ==================== 用户认证 ====================
function userLogin() {
    const username = $('loginUsername').value.trim();
    const password = $('loginPassword').value.trim();
    if (!username || !password) { showToast('请输入用户名和密码', 'warning'); return; }

    const users = Storage.get('sr_users') || [];
    const user = users.find(u => u.username === username && u.password === password && u.role === 'user');
    if (!user) { showToast('用户名或密码错误', 'error'); return; }
    if (user.status === 'disabled') { showToast('该账号已被禁用，请联系管理员', 'error'); return; }

    currentUser = { id: user.id, username: user.username, role: user.role };
    saveSession();
    showToast(`欢迎回来，${user.username}！`, 'success');
    $('loginUsername').value = ''; $('loginPassword').value = '';
    navigate('home');
}

function userRegister() {
    const username = $('regUsername').value.trim();
    const phone = $('regPhone').value.trim();
    const password = $('regPassword').value;
    const password2 = $('regPassword2').value;

    if (!username) { showToast('请输入用户名', 'warning'); return; }
    if (username.length < 3) { showToast('用户名至少3个字符', 'warning'); return; }
    if (password !== password2) { showToast('两次输入的密码不一致', 'warning'); return; }
    if (password.length < 6) { showToast('密码至少6位', 'warning'); return; }

    let users = Storage.get('sr_users') || [];
    if (users.find(u => u.username === username)) { showToast('该用户名已被注册', 'error'); return; }

    const newUser = {
        id: genId(users),
        username,
        password,
        phone,
        role: 'user',
        status: 'active',
        createdAt: todayStr()
    };
    users.push(newUser);
    Storage.set('sr_users', users);

    showToast('注册成功，请登录', 'success');
    $('regUsername').value = ''; $('regPhone').value = ''; $('regPassword').value = ''; $('regPassword2').value = '';
    navigate('user-login');
}

function userLogout() {
    showConfirm('退出登录', '确定要退出登录吗？', () => {
        clearSession();
        showToast('已退出登录', 'info');
        navigate('home');
    });
}

function adminLogin() {
    const username = $('adminUsername').value.trim();
    const password = $('adminPassword').value.trim();
    if (!username || !password) { showToast('请输入管理员账号和密码', 'warning'); return; }

    const users = Storage.get('sr_users') || [];
    const admin = users.find(u => u.username === username && u.password === password && u.role === 'admin');
    if (!admin) { showToast('管理员账号或密码错误', 'error'); return; }

    currentUser = { id: admin.id, username: admin.username, role: 'admin' };
    saveSession();
    showToast('管理员登录成功', 'success');
    $('adminUsername').value = ''; $('adminPassword').value = '';
    navigate('admin-dashboard');
}

function adminLogout() {
    showConfirm('退出管理', '确定要退出管理员后台吗？', () => {
        clearSession();
        showToast('已退出管理员模式', 'info');
        navigate('home');
    });
}

// ==================== 首页渲染 ====================
function renderHome() {
    const settings = Storage.get('sr_settings') || {};
    const anns = Storage.get('sr_announcements') || [];

    // 公告
    let annHtml = '';
    if (anns.length === 0) {
        annHtml = '<div class="empty-state"><i class="fas fa-bullhorn"></i><p>暂无公告</p></div>';
    } else {
        anns.slice().reverse().forEach(a => {
            annHtml += `<div class="announcement-item"><strong>${escHtml(a.title)}</strong><div class="ann-date"><i class="far fa-calendar me-1"></i>${a.date}</div><p class="mt-1 mb-0 text-muted">${escHtml(a.content)}</p></div>`;
        });
    }
    $('homeAnnouncements').innerHTML = annHtml;

    // 开放时间
    $('homeHours').innerHTML = `
        <ul class="info-list mb-0">
            <li><i class="fas fa-door-open"></i>开门时间：<strong>${settings.openTime || '08:00'}</strong></li>
            <li><i class="fas fa-door-closed"></i>关门时间：<strong>${settings.closeTime || '22:00'}</strong></li>
            <li><i class="fas fa-calendar-week"></i>营业日：<strong>周一至周日 全年无休</strong></li>
        </ul>`;

    // 收费标准
    $('homePrices').innerHTML = settings.priceStandard || '<p>暂无收费标准</p>';
}

function escHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ==================== 座位浏览 ====================
function renderSeats() {
    const seats = Storage.get('sr_seats') || [];
    let html = '';
    if (seats.length === 0) {
        html = '<div class="col-12"><div class="empty-state"><i class="fas fa-chair"></i><p>暂无座位数据</p></div></div>';
    } else {
        seats.forEach(s => {
            const st = STATUS_MAP[s.status] || STATUS_MAP['available'];
            html += `
            <div class="col-lg-3 col-md-4 col-sm-6">
                <div class="seat-card ${s.status}">
                    <div class="seat-icon"><i class="fas fa-chair"></i></div>
                    <div class="seat-name">${escHtml(s.name)}</div>
                    <div class="seat-location"><i class="fas fa-map-marker-alt me-1"></i>${escHtml(s.location)} - ${escHtml(s.type)}</div>
                    <span class="status-badge ${st.cls} mt-2"><i class="fas ${st.icon} me-1"></i>${st.label}</span>
                    ${s.description ? `<p class="text-muted small mt-2 mb-0">${escHtml(s.description)}</p>` : ''}
                </div>
            </div>`;
        });
    }
    $('seatGrid').innerHTML = html;
}

// ==================== 预约模块 ====================
function renderReserve() {
    const seats = Storage.get('sr_seats') || [];
    // 座位选择网格
    let seatHtml = '';
    seats.forEach(s => {
        const st = STATUS_MAP[s.status] || STATUS_MAP['available'];
        seatHtml += `
        <div class="col-lg-4 col-md-6">
            <div class="seat-card ${s.status}" data-seat-id="${s.id}" style="cursor:${s.status==='available'?'pointer':'not-allowed'};" onclick="${s.status==='available' ? 'selectReserveSeat('+s.id+')' : ''}">
                <div class="seat-icon"><i class="fas fa-chair"></i></div>
                <div class="seat-name">${escHtml(s.name)}</div>
                <div class="seat-location">${escHtml(s.location)} - ${escHtml(s.type)}</div>
                <span class="status-badge ${st.cls} mt-2"><i class="fas ${st.icon} me-1"></i>${st.label}</span>
            </div>
        </div>`;
    });
    $('reserveSeatGrid').innerHTML = seatHtml;

    // 时间段选择
    let slotHtml = '';
    TIME_SLOTS.forEach((ts, idx) => {
        slotHtml += `<span class="time-slot-item" id="slot_${idx}" onclick="selectTimeSlot(${idx})">${ts}</span>`;
    });
    $('timeSlotPicker').innerHTML = slotHtml;

    // 日期默认今天
    $('reserveDate').value = todayStr();
    $('reserveDate').min = todayStr();
    $('reserveSeatId').value = '';
    $('reserveSeatInfo').innerHTML = '请先在左侧选择座位';
    // 重置已选时间段
    document.querySelectorAll('#timeSlotPicker .time-slot-item').forEach(el => el.classList.remove('selected'));
    window._selectedSlot = null;
}

function selectReserveSeat(sid) {
    // 高亮选中
    document.querySelectorAll('#reserveSeatGrid .seat-card').forEach(c => c.style.boxShadow = '');
    const card = document.querySelector(`#reserveSeatGrid .seat-card[data-seat-id="${sid}"]`);
    if (card) card.style.boxShadow = '0 0 0 3px var(--primary)';
    $('reserveSeatId').value = sid;
    const seat = getSeatById(sid);
    if (seat) {
        $('reserveSeatInfo').innerHTML = `<strong>已选座位：</strong>${escHtml(seat.name)} (${escHtml(seat.location)} - ${escHtml(seat.type)})`;
    }
}

function selectTimeSlot(idx) {
    document.querySelectorAll('#timeSlotPicker .time-slot-item').forEach(el => el.classList.remove('selected'));
    $('slot_' + idx).classList.add('selected');
    window._selectedSlot = idx;
}

function submitReservation() {
    if (!currentUser || currentUser.role !== 'user') { showToast('请先登录用户账号', 'warning'); navigate('user-login'); return; }

    const seatId = parseInt($('reserveSeatId').value);
    const date = $('reserveDate').value;
    const slotIdx = window._selectedSlot;

    if (!seatId) { showToast('请先选择座位', 'warning'); return; }
    if (!date) { showToast('请选择预约日期', 'warning'); return; }
    if (slotIdx === undefined || slotIdx === null) { showToast('请选择时间段', 'warning'); return; }

    // 检查座位是否可用
    const seat = getSeatById(seatId);
    if (!seat || seat.status !== 'available') { showToast('该座位当前不可预约', 'error'); renderReserve(); return; }

    // 冲突检测：同一座位同一日期同一时间段
    const reservations = Storage.get('sr_reservations') || [];
    const timeSlot = TIME_SLOTS[slotIdx];
    const conflict = reservations.find(r =>
        r.seatId === seatId && r.date === date && r.timeSlot === timeSlot && r.status !== 'cancelled'
    );
    if (conflict) { showToast('该座位在所选日期和时间段已被预约，请选择其他座位或时间段', 'warning'); return; }

    // 同一用户同一时间段不能重复预约
    const userConflict = reservations.find(r =>
        r.userId === currentUser.id && r.date === date && r.timeSlot === timeSlot && r.status !== 'cancelled'
    );
    if (userConflict) { showToast('您在该时间段已有预约，请勿重复预约', 'warning'); return; }

    const newResv = {
        id: genId(reservations),
        userId: currentUser.id,
        seatId,
        date,
        timeSlot,
        status: 'approved', // 自动通过
        createdAt: nowStr()
    };
    reservations.push(newResv);
    Storage.set('sr_reservations', reservations);

    // 更新座位状态
    const seats = Storage.get('sr_seats') || [];
    const seatToUpdate = seats.find(s => s.id === seatId);
    if (seatToUpdate) { seatToUpdate.status = 'reserved'; Storage.set('sr_seats', seats); }

    showToast('预约成功！', 'success');
    navigate('my-reservations');
}

// ==================== 我的预约 ====================
function renderMyReservations() {
    if (!currentUser || currentUser.role !== 'user') return;
    const reservations = Storage.get('sr_reservations') || [];
    const myResvs = reservations.filter(r => r.userId === currentUser.id).sort((a, b) => b.id - a.id);

    if (myResvs.length === 0) {
        $('myReservationsTable').innerHTML = '';
        $('myReservationsEmpty').style.display = 'block';
        return;
    }
    $('myReservationsEmpty').style.display = 'none';

    let html = '';
    myResvs.forEach(r => {
        const seat = getSeatById(r.seatId);
        const st = RESV_STATUS_MAP[r.status] || { label: r.status, cls: '' };
        const canCancel = r.status === 'approved' || r.status === 'pending';
        html += `<tr>
            <td>${seat ? escHtml(seat.name) + ' (' + escHtml(seat.location) + ')' : '未知座位'}</td>
            <td>${r.date}</td>
            <td>${r.timeSlot}</td>
            <td><span class="status-badge ${st.cls}">${st.label}</span></td>
            <td><small>${r.createdAt}</small></td>
            <td>${canCancel ? `<button class="btn btn-outline-danger btn-sm" onclick="cancelReservation(${r.id})"><i class="fas fa-times me-1"></i>取消</button>` : '<small class="text-muted">--</small>'}</td>
        </tr>`;
    });
    $('myReservationsTable').innerHTML = html;
}

function cancelReservation(resvId) {
    showConfirm('取消预约', '确定要取消此预约吗？取消后不可恢复。', () => {
        let reservations = Storage.get('sr_reservations') || [];
        const resv = reservations.find(r => r.id === resvId);
        if (!resv) { showToast('预约记录不存在', 'error'); return; }
        if (resv.status !== 'approved' && resv.status !== 'pending') { showToast('该预约当前状态不可取消', 'warning'); return; }

        resv.status = 'cancelled';
        Storage.set('sr_reservations', reservations);

        // 释放座位
        const seats = Storage.get('sr_seats') || [];
        const seat = seats.find(s => s.id === resv.seatId);
        if (seat && seat.status === 'reserved') {
            // 检查该座位是否还有其他有效预约
            const otherActive = reservations.find(r => r.seatId === seat.id && r.id !== resvId &&
                (r.status === 'approved' || r.status === 'pending') && r.date === resv.date);
            if (!otherActive) seat.status = 'available';
            Storage.set('sr_seats', seats);
        }

        showToast('预约已取消', 'success');
        renderMyReservations();
    });
}

// ==================== 个人中心 ====================
function renderProfile() {
    if (!currentUser || currentUser.role !== 'user') return;
    const user = getUserById(currentUser.id);
    if (!user) return;

    $('profileInfo').innerHTML = `
        <ul class="info-list">
            <li><i class="fas fa-user"></i>用户名：<strong>${escHtml(user.username)}</strong></li>
            <li><i class="fas fa-phone"></i>手机号：<strong>${escHtml(user.phone || '未填写')}</strong></li>
            <li><i class="fas fa-user-tag"></i>角色：<strong>普通用户</strong></li>
            <li><i class="fas fa-circle-check text-success"></i>状态：<strong>${user.status === 'active' ? '正常' : '已禁用'}</strong></li>
            <li><i class="fas fa-calendar"></i>注册时间：<strong>${user.createdAt}</strong></li>
        </ul>`;

    $('oldPassword').value = '';
    $('newPassword').value = '';
    $('newPassword2').value = '';
}

function changePassword() {
    if (!currentUser) return;
    const oldPwd = $('oldPassword').value;
    const newPwd = $('newPassword').value;
    const newPwd2 = $('newPassword2').value;

    if (!oldPwd) { showToast('请输入原密码', 'warning'); return; }
    if (newPwd !== newPwd2) { showToast('两次输入的新密码不一致', 'warning'); return; }
    if (newPwd.length < 6) { showToast('新密码至少6位', 'warning'); return; }

    let users = Storage.get('sr_users') || [];
    const user = users.find(u => u.id === currentUser.id);
    if (!user || user.password !== oldPwd) { showToast('原密码错误', 'error'); return; }

    user.password = newPwd;
    Storage.set('sr_users', users);
    showToast('密码修改成功', 'success');
    $('oldPassword').value = ''; $('newPassword').value = ''; $('newPassword2').value = '';
}

// ==================== 管理员-控制台 ====================
function renderAdminDashboard() {
    if (!currentUser || currentUser.role !== 'admin') return;
    const users = Storage.get('sr_users') || [];
    const seats = Storage.get('sr_seats') || [];
    const reservations = Storage.get('sr_reservations') || [];
    const today = todayStr();

    const totalUsers = users.filter(u => u.role === 'user').length;
    const totalSeats = seats.length;
    const todayResvs = reservations.filter(r => r.date === today && r.status !== 'cancelled').length;
    const pendingResvs = reservations.filter(r => r.status === 'pending').length;

    $('adminStats').innerHTML = `
        <div class="col-lg-3 col-md-6"><div class="stat-card blue"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-num">${totalUsers}</div><div class="stat-label">总用户数</div></div></div>
        <div class="col-lg-3 col-md-6"><div class="stat-card green"><div class="stat-icon"><i class="fas fa-chair"></i></div><div class="stat-num">${totalSeats}</div><div class="stat-label">总座位数</div></div></div>
        <div class="col-lg-3 col-md-6"><div class="stat-card orange"><div class="stat-icon"><i class="fas fa-calendar-check"></i></div><div class="stat-num">${todayResvs}</div><div class="stat-label">今日预约数</div></div></div>
        <div class="col-lg-3 col-md-6"><div class="stat-card purple"><div class="stat-icon"><i class="fas fa-hourglass-half"></i></div><div class="stat-num">${pendingResvs}</div><div class="stat-label">待审核数</div></div></div>`;

    // 今日预约
    const todayList = reservations.filter(r => r.date === today).sort((a, b) => b.id - a.id);
    if (todayList.length === 0) {
        $('adminTodayReservations').innerHTML = '';
        $('adminTodayEmpty').style.display = 'block';
    } else {
        $('adminTodayEmpty').style.display = 'none';
        let html = '';
        todayList.forEach(r => {
            const user = getUserById(r.userId);
            const seat = getSeatById(r.seatId);
            const st = RESV_STATUS_MAP[r.status] || { label: r.status, cls: '' };
            html += `<tr><td>${user ? escHtml(user.username) : '未知'}</td><td>${seat ? escHtml(seat.name) : '未知'}</td><td>${r.timeSlot}</td><td><span class="status-badge ${st.cls}">${st.label}</span></td></tr>`;
        });
        $('adminTodayReservations').innerHTML = html;
    }
}

function addQuickAnnounce() {
    const title = $('quickAnnTitle').value.trim();
    const content = $('quickAnnContent').value.trim();
    if (!title || !content) { showToast('请填写公告标题和内容', 'warning'); return; }

    let anns = Storage.get('sr_announcements') || [];
    anns.push({ id: genId(anns), title, content, date: todayStr() });
    Storage.set('sr_announcements', anns);
    showToast('公告发布成功', 'success');
    $('quickAnnTitle').value = ''; $('quickAnnContent').value = '';
    renderAdminDashboard();
}

// ==================== 管理员-用户管理 ====================
function renderAdminUsers() {
    if (!currentUser || currentUser.role !== 'admin') return;
    const users = Storage.get('sr_users') || [];
    const normalUsers = users.filter(u => u.role === 'user').sort((a, b) => b.id - a.id);
    $('adminUserCount').textContent = `共 ${normalUsers.length} 个普通用户`;

    let html = '';
    normalUsers.forEach(u => {
        html += `<tr>
            <td>${u.id}</td>
            <td>${escHtml(u.username)}</td>
            <td>${escHtml(u.phone || '--')}</td>
            <td><span class="badge bg-secondary">用户</span></td>
            <td><span class="badge ${u.status === 'active' ? 'bg-success' : 'bg-danger'}">${u.status === 'active' ? '启用' : '禁用'}</span></td>
            <td>${u.createdAt}</td>
            <td>
                ${u.status === 'active'
                    ? `<button class="btn btn-warning btn-sm me-1" onclick="toggleUserStatus(${u.id})"><i class="fas fa-ban me-1"></i>禁用</button>`
                    : `<button class="btn btn-success btn-sm me-1" onclick="toggleUserStatus(${u.id})"><i class="fas fa-check me-1"></i>启用</button>`}
                <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})"><i class="fas fa-trash me-1"></i>删除</button>
            </td>
        </tr>`;
    });
    $('adminUsersTable').innerHTML = html || '<tr><td colspan="7" class="text-center text-muted py-3">暂无用户</td></tr>';
}

function toggleUserStatus(uid) {
    let users = Storage.get('sr_users') || [];
    const user = users.find(u => u.id === uid);
    if (!user) return;
    user.status = user.status === 'active' ? 'disabled' : 'active';
    Storage.set('sr_users', users);
    showToast(`用户已${user.status === 'active' ? '启用' : '禁用'}`, 'success');
    renderAdminUsers();
}

function deleteUser(uid) {
    showConfirm('删除用户', '确定要删除此用户吗？该操作不可恢复，关联的预约记录也将一并删除。', () => {
        let users = Storage.get('sr_users') || [];
        users = users.filter(u => u.id !== uid);
        Storage.set('sr_users', users);

        let reservations = Storage.get('sr_reservations') || [];
        reservations = reservations.filter(r => r.userId !== uid);
        Storage.set('sr_reservations', reservations);

        showToast('用户已删除', 'success');
        renderAdminUsers();
    });
}

// ==================== 管理员-座位管理 ====================
function renderAdminSeats() {
    if (!currentUser || currentUser.role !== 'admin') return;
    const seats = Storage.get('sr_seats') || [];
    let html = '';
    seats.forEach(s => {
        const st = STATUS_MAP[s.status] || STATUS_MAP['available'];
        html += `<tr>
            <td>${s.id}</td>
            <td>${escHtml(s.name)}</td>
            <td>${escHtml(s.location)}</td>
            <td>${escHtml(s.type)}</td>
            <td><span class="status-badge ${st.cls}">${st.label}</span></td>
            <td>${escHtml(s.description || '--')}</td>
            <td>
                <button class="btn btn-outline-primary btn-sm me-1" onclick="showEditSeatModal(${s.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-outline-danger btn-sm" onclick="deleteSeat(${s.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });
    $('adminSeatsTable').innerHTML = html || '<tr><td colspan="7" class="text-center text-muted py-3">暂无座位</td></tr>';
}

function showAddSeatModal() {
    $('seatModalTitle').textContent = '添加座位';
    $('seatEditId').value = '';
    $('seatName').value = '';
    $('seatLocation').value = '';
    $('seatType').value = '标准座';
    $('seatStatus').value = 'available';
    $('seatDesc').value = '';
    new bootstrap.Modal($('seatModal')).show();
}

function showEditSeatModal(sid) {
    const seat = getSeatById(sid);
    if (!seat) return;
    $('seatModalTitle').textContent = '编辑座位';
    $('seatEditId').value = seat.id;
    $('seatName').value = seat.name;
    $('seatLocation').value = seat.location;
    $('seatType').value = seat.type;
    $('seatStatus').value = seat.status;
    $('seatDesc').value = seat.description || '';
    new bootstrap.Modal($('seatModal')).show();
}

function saveSeat() {
    const editId = $('seatEditId').value;
    const name = $('seatName').value.trim();
    const location = $('seatLocation').value.trim();
    const type = $('seatType').value;
    const status = $('seatStatus').value;
    const desc = $('seatDesc').value.trim();

    if (!name || !location) { showToast('请填写座位名称和位置', 'warning'); return; }

    let seats = Storage.get('sr_seats') || [];
    if (editId) {
        const seat = seats.find(s => s.id === parseInt(editId));
        if (seat) { seat.name = name; seat.location = location; seat.type = type; seat.status = status; seat.description = desc; }
    } else {
        seats.push({ id: genId(seats), name, location, type, status, description: desc });
    }
    Storage.set('sr_seats', seats);
    bootstrap.Modal.getInstance($('seatModal')).hide();
    showToast(editId ? '座位更新成功' : '座位添加成功', 'success');
    renderAdminSeats();
}

function deleteSeat(sid) {
    showConfirm('删除座位', '确定要删除此座位吗？关联的预约记录不会删除。', () => {
        let seats = Storage.get('sr_seats') || [];
        seats = seats.filter(s => s.id !== sid);
        Storage.set('sr_seats', seats);
        showToast('座位已删除', 'success');
        renderAdminSeats();
    });
}

// ==================== 管理员-预约管理 ====================
function renderAdminReservations() {
    if (!currentUser || currentUser.role !== 'admin') return;
    const reservations = Storage.get('sr_reservations') || [];
    const sorted = reservations.slice().sort((a, b) => b.id - a.id);

    let html = '';
    sorted.forEach(r => {
        const user = getUserById(r.userId);
        const seat = getSeatById(r.seatId);
        const st = RESV_STATUS_MAP[r.status] || { label: r.status, cls: '' };
        html += `<tr>
            <td>${r.id}</td>
            <td>${user ? escHtml(user.username) : '未知'}</td>
            <td>${seat ? escHtml(seat.name) + '(' + escHtml(seat.location) + ')' : '未知'}</td>
            <td>${r.date}</td>
            <td>${r.timeSlot}</td>
            <td><span class="status-badge ${st.cls}">${st.label}</span></td>
            <td><small>${r.createdAt}</small></td>
            <td>
                ${r.status === 'pending' ? `<button class="btn btn-success btn-sm me-1" onclick="approveReservation(${r.id})"><i class="fas fa-check me-1"></i>通过</button>` : ''}
                ${r.status === 'approved' || r.status === 'pending' ? `<button class="btn btn-warning btn-sm me-1" onclick="adminCancelReservation(${r.id})"><i class="fas fa-times me-1"></i>取消</button>` : ''}
                ${r.status === 'approved' ? `<button class="btn btn-info btn-sm me-1" onclick="completeReservation(${r.id})"><i class="fas fa-flag-checkered me-1"></i>完成</button>` : ''}
                <button class="btn btn-outline-danger btn-sm" onclick="adminDeleteReservation(${r.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });
    $('adminReservationsTable').innerHTML = html || '<tr><td colspan="8" class="text-center text-muted py-3">暂无预约记录</td></tr>';
}

function approveReservation(rid) {
    let reservations = Storage.get('sr_reservations') || [];
    const r = reservations.find(x => x.id === rid);
    if (r) r.status = 'approved';
    Storage.set('sr_reservations', reservations);
    // 更新座位状态
    updateSeatStatusFromReservations();
    showToast('预约已通过', 'success');
    renderAdminReservations();
}

function adminCancelReservation(rid) {
    showConfirm('取消预约', '确定要取消此预约吗？', () => {
        let reservations = Storage.get('sr_reservations') || [];
        const r = reservations.find(x => x.id === rid);
        if (r) r.status = 'cancelled';
        Storage.set('sr_reservations', reservations);
        updateSeatStatusFromReservations();
        showToast('预约已取消', 'success');
        renderAdminReservations();
    });
}

function completeReservation(rid) {
    let reservations = Storage.get('sr_reservations') || [];
    const r = reservations.find(x => x.id === rid);
    if (r) r.status = 'completed';
    Storage.set('sr_reservations', reservations);
    updateSeatStatusFromReservations();
    showToast('预约已完成', 'success');
    renderAdminReservations();
}

function adminDeleteReservation(rid) {
    showConfirm('删除预约', '确定要永久删除此预约记录吗？', () => {
        let reservations = Storage.get('sr_reservations') || [];
        reservations = reservations.filter(r => r.id !== rid);
        Storage.set('sr_reservations', reservations);
        updateSeatStatusFromReservations();
        showToast('预约记录已删除', 'success');
        renderAdminReservations();
    });
}

function updateSeatStatusFromReservations() {
    const seats = Storage.get('sr_seats') || [];
    const reservations = Storage.get('sr_reservations') || [];

    seats.forEach(seat => {
        const activeResv = reservations.find(r =>
            r.seatId === seat.id && (r.status === 'approved' || r.status === 'pending')
        );
        if (activeResv) {
            seat.status = 'reserved';
        } else {
            seat.status = 'available';
        }
    });
    Storage.set('sr_seats', seats);
}

function exportReservations() {
    const reservations = Storage.get('sr_reservations') || [];
    if (reservations.length === 0) { showToast('暂无预约记录可导出', 'info'); return; }

    let csv = '﻿ID,用户名,座位,日期,时间段,状态,预约时间\n';
    reservations.forEach(r => {
        const user = getUserById(r.userId);
        const seat = getSeatById(r.seatId);
        csv += `${r.id},"${user ? user.username : '未知'}","${seat ? seat.name : '未知'}",${r.date},${r.timeSlot},${r.status},${r.createdAt}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `预约记录导出_${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('导出成功', 'success');
}

// ==================== 管理员-系统设置 ====================
function renderAdminSettings() {
    if (!currentUser || currentUser.role !== 'admin') return;
    const settings = Storage.get('sr_settings') || {};
    $('setOpenTime').value = settings.openTime || '08:00';
    $('setCloseTime').value = settings.closeTime || '22:00';
    $('setPrice').value = settings.priceStandard || '';

    // 公告列表
    const anns = Storage.get('sr_announcements') || [];
    let annHtml = '';
    anns.slice().reverse().forEach(a => {
        annHtml += `<div class="d-flex justify-content-between align-items-center border-bottom py-2">
            <div><strong>${escHtml(a.title)}</strong><br><small class="text-muted">${a.date} - ${escHtml(a.content).substring(0, 30)}...</small></div>
            <button class="btn btn-outline-danger btn-sm" onclick="deleteAnnounce(${a.id})"><i class="fas fa-trash"></i></button>
        </div>`;
    });
    $('adminAnnounceList').innerHTML = annHtml || '<p class="text-muted">暂无公告</p>';
}

function addAnnounce() {
    const title = $('annTitle').value.trim();
    const content = $('annContent').value.trim();
    if (!title || !content) { showToast('请填写标题和内容', 'warning'); return; }
    let anns = Storage.get('sr_announcements') || [];
    anns.push({ id: genId(anns), title, content, date: todayStr() });
    Storage.set('sr_announcements', anns);
    showToast('公告已添加', 'success');
    $('annTitle').value = ''; $('annContent').value = '';
    renderAdminSettings();
}

function deleteAnnounce(aid) {
    showConfirm('删除公告', '确定删除该公告吗？', () => {
        let anns = Storage.get('sr_announcements') || [];
        anns = anns.filter(a => a.id !== aid);
        Storage.set('sr_announcements', anns);
        showToast('公告已删除', 'success');
        renderAdminSettings();
    });
}

function saveHours() {
    let settings = Storage.get('sr_settings') || {};
    settings.openTime = $('setOpenTime').value;
    settings.closeTime = $('setCloseTime').value;
    Storage.set('sr_settings', settings);
    showToast('开放时间已保存', 'success');
}

function savePrice() {
    let settings = Storage.get('sr_settings') || {};
    settings.priceStandard = $('setPrice').value;
    Storage.set('sr_settings', settings);
    showToast('收费标准已保存', 'success');
}

function changeAdminPwd() {
    const newPwd = $('adminNewPwd').value;
    if (!newPwd || newPwd.length < 6) { showToast('新密码至少6位', 'warning'); return; }

    let users = Storage.get('sr_users') || [];
    const admin = users.find(u => u.id === currentUser.id);
    if (admin) { admin.password = newPwd; Storage.set('sr_users', users); }

    showToast('管理员密码修改成功', 'success');
    $('adminNewPwd').value = '';
}

// ==================== 初始化 ====================
function init() {
    initDefaultData();
    updateNavbar('home');

    // 如果已登录，恢复会话
    if (currentUser) {
        const user = getUserById(currentUser.id);
        if (!user || (user.role === 'user' && user.status === 'disabled')) {
            clearSession();
            showToast('会话已过期或账号已被禁用', 'warning');
            navigate('home');
            return;
        }
        if (currentUser.role === 'admin') {
            navigate('admin-dashboard');
        } else {
            navigate('home');
        }
    } else {
        navigate('home');
    }

    // 回车键登录
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const activeView = document.querySelector('.view-container.active');
            if (!activeView) return;
            const activeId = activeView.id;
            if (activeId === 'view-user-login') userLogin();
            else if (activeId === 'view-admin-login') adminLogin();
        }
    });
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);

console.log('静思自习室预约管理系统已就绪 🚀');
console.log('用户登录：testuser / 123456');
console.log('管理员登录：admin / 123456');
console.log('数据存储于 localStorage，可在浏览器开发者工具中查看');
