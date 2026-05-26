// Vida RPG — engine simples baseado em estado + render por aba.
// Estado salvo em localStorage. Toda mutação passa por updateState() para re-renderizar.

(function () {
  const DATA = window.GAME_DATA;
  const STORAGE_KEY = 'vida-rpg.save.v1';

  // ----------------- Estado -----------------
  let state = null;

  const defaultState = (name, classKey) => {
    const cls = DATA.CLASSES[classKey];
    return {
      version: 1,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      lastDailyReset: todayKey(),
      streak: 0,
      player: {
        name,
        classKey,
        avatar: cls.avatar,
        level: 1,
        xp: 0,
        hp: 100, maxHp: 100,
        energy: 50, maxEnergy: 50,
        coins: 10,
        attrs: { ...cls.attrs },
      },
      main: {
        id: DATA.MAIN_QUEST.id,
        currentStep: 0,
        stepsProgress: {}, // stepId -> progresso atual
        completedSteps: [], // stepIds
        done: false,
      },
      sides: {}, // sideId -> { progress, done }
      dailies: {}, // dailyId -> { done }
      bosses: {}, // bossId -> { hp, defeated }
      inventory: {}, // itemId -> count
      passives: {}, // attrName -> totalBonus
      log: [],
      ui: { tab: 'status' },
    };
  };

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return s;
    } catch (e) { return null; }
  }

  function save() {
    try {
      state.lastSeen = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      const el = document.getElementById('save-status');
      if (el) el.textContent = 'salvo';
    } catch (e) {
      const el = document.getElementById('save-status');
      if (el) el.textContent = 'erro';
    }
  }

  function xpToNextLevel(level) {
    return Math.floor(100 * Math.pow(1.25, level - 1));
  }

  // ----------------- Mutações -----------------
  function updateState(mutate, logEntry) {
    mutate(state);
    if (logEntry) addLog(logEntry);
    save();
    render();
  }

  function addLog(entry) {
    state.log.unshift({ when: Date.now(), ...entry });
    if (state.log.length > 200) state.log = state.log.slice(0, 200);
  }

  function applyReward(p, reward, source) {
    const messages = [];
    if (reward.xp) {
      const bonus = xpBonus(reward, source);
      const totalXp = Math.round(reward.xp * bonus);
      gainXp(p, totalXp, messages);
    }
    if (reward.coins) {
      p.coins += reward.coins;
      messages.push(`+${reward.coins} 🪙`);
    }
    if (reward.hpHeal) {
      const before = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + reward.hpHeal);
      messages.push(`+${p.hp - before} ❤️`);
    }
    if (reward.energyHeal) {
      const before = p.energy;
      p.energy = Math.min(p.maxEnergy, p.energy + reward.energyHeal);
      messages.push(`+${p.energy - before} ⚡`);
    }
    if (reward.item) {
      state.inventory[reward.item] = (state.inventory[reward.item] || 0) + 1;
      const itemName = DATA.ITEMS[reward.item]?.name || reward.item;
      messages.push(`+1 ${itemName}`);
    }
    return messages;
  }

  function xpBonus(reward, source) {
    // Bônus de classe
    let bonus = 1;
    const cls = state.player.classKey;
    if (cls === 'erudito' && source && /quest|quest(o|õ)es|enem|estudo/i.test(source)) bonus += 0.2;
    if (cls === 'bardo' && source && /reda(ç|c)(ã|a)o/i.test(source)) bonus += 0.3;
    return bonus;
  }

  function gainXp(p, amount, messages) {
    p.xp += amount;
    if (messages) messages.push(`+${amount} XP`);
    let leveled = false;
    while (p.xp >= xpToNextLevel(p.level)) {
      p.xp -= xpToNextLevel(p.level);
      p.level += 1;
      p.maxHp += 10;
      p.hp = p.maxHp;
      p.maxEnergy += (state.player.classKey === 'monge' ? 6 : 4);
      p.energy = p.maxEnergy;
      p.coins += 20;
      leveled = true;
      addLog({ kind: 'epic', msg: `🎉 Subiu para Nv. ${p.level}! +10 HP máx, +energia, +20 🪙` });
      toast(`Nível ${p.level}!`, 'epic');
    }
    return leveled;
  }

  // ----------------- Daily reset -----------------
  function checkDailyReset() {
    const today = todayKey();
    if (state.lastDailyReset !== today) {
      const prev = state.lastDailyReset;
      const yesterday = (() => {
        const d = new Date(); d.setDate(d.getDate() - 1);
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      })();
      // Sequência: se completou pelo menos 1 daily ontem, mantém. Se não, zera.
      const completedYesterday = Object.values(state.dailies).some(d => d.done);
      if (prev === yesterday && completedYesterday) {
        state.streak += 1;
      } else if (prev !== today) {
        state.streak = 0;
      }
      // Reset dailies
      state.dailies = {};
      state.lastDailyReset = today;
      // Regen leve
      state.player.energy = state.player.maxEnergy;
      addLog({ kind: 'info', msg: `🌅 Novo dia! Energia restaurada. Sequência: ${state.streak} 🔥` });
    }
  }

  // ----------------- Render -----------------
  function render() {
    const game = document.getElementById('screen-game');
    if (!state) {
      document.getElementById('screen-onboarding').classList.remove('hidden');
      game.classList.add('hidden');
      return;
    }
    document.getElementById('screen-onboarding').classList.add('hidden');
    game.classList.remove('hidden');

    renderTopbar();
    renderTab(state.ui.tab);
  }

  function renderTopbar() {
    const p = state.player;
    document.getElementById('avatar').textContent = p.avatar;
    document.getElementById('hero-name').textContent = p.name;
    document.getElementById('hero-class').textContent = DATA.CLASSES[p.classKey].name;
    document.getElementById('hero-level').textContent = `Nv. ${p.level}`;

    const nextXp = xpToNextLevel(p.level);
    const pct = Math.min(100, (p.xp / nextXp) * 100);
    document.getElementById('xpbar-fill').style.width = pct + '%';
    document.getElementById('xpbar-text').textContent = `${p.xp} / ${nextXp} XP`;

    document.getElementById('hp-fill').style.width = Math.max(0, (p.hp / p.maxHp) * 100) + '%';
    document.getElementById('hp-text').textContent = `${p.hp}/${p.maxHp}`;
    document.getElementById('mp-fill').style.width = Math.max(0, (p.energy / p.maxEnergy) * 100) + '%';
    document.getElementById('mp-text').textContent = `${p.energy}/${p.maxEnergy}`;
    document.getElementById('coins-text').textContent = p.coins;
    document.getElementById('streak-text').textContent = `${state.streak}d`;
  }

  function renderTab(tab) {
    document.querySelectorAll('.tab').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
    document.querySelectorAll('.tabpane').forEach(el => el.classList.toggle('active', el.id === `tab-${tab}`));
    const target = document.getElementById(`tab-${tab}`);
    if (!target) return;
    target.innerHTML = '';
    switch (tab) {
      case 'status': renderStatus(target); break;
      case 'missoes': renderMissoes(target); break;
      case 'npcs': renderNpcs(target); break;
      case 'bosses': renderBosses(target); break;
      case 'inventario': renderInventario(target); break;
      case 'diario': renderDiario(target); break;
    }
  }

  // --- Status
  function renderStatus(root) {
    const p = state.player;
    const grid = el('div', 'grid-2');

    const card1 = el('div', 'card');
    card1.appendChild(h('h3 section-title', 'Atributos'));
    const attrs = el('div', 'attrs');
    const passives = state.passives || {};
    const order = [
      ['inteligencia', 'Inteligência', '🧠'],
      ['disciplina', 'Disciplina', '🛡️'],
      ['sabedoria', 'Sabedoria', '📖'],
      ['carisma', 'Carisma', '🎭'],
      ['foco', 'Foco', '🎯'],
    ];
    order.forEach(([key, label, icon]) => {
      const base = p.attrs[key] || 0;
      const bonus = passives[key] || 0;
      const row = el('div', 'attr-row');
      row.innerHTML = `<span>${icon} ${label}</span><span class="attr-val">${base + bonus}${bonus ? ` <span class="muted small">(+${bonus})</span>` : ''}</span>`;
      attrs.appendChild(row);
    });
    card1.appendChild(attrs);

    const card2 = el('div', 'card');
    card2.appendChild(h('h3 section-title', 'Resumo do dia'));
    const todayDailies = DATA.DAILY_QUESTS.filter(d => state.dailies[d.id]?.done).length;
    const totalDailies = DATA.DAILY_QUESTS.length;
    const mainStep = DATA.MAIN_QUEST.steps[state.main.currentStep];
    card2.appendChild(h('p', `📅 Missões diárias: <strong>${todayDailies}/${totalDailies}</strong>`));
    card2.appendChild(h('p', `🔥 Sequência atual: <strong>${state.streak}</strong> dia(s)`));
    card2.appendChild(h('p', `🎯 Missão principal: <strong>${mainStep ? mainStep.title : 'CONCLUÍDA — você venceu o ENEM!'}</strong>`));
    card2.appendChild(h('p muted small', 'Dica: complete pelo menos 1 missão diária por dia para manter a sequência.'));

    grid.appendChild(card1);
    grid.appendChild(card2);
    root.appendChild(grid);

    // Loja
    const shop = el('div', 'card');
    shop.appendChild(h('h3 section-title', 'Loja do Aventureiro'));
    const shopGrid = el('div', 'inv-grid');
    DATA.SHOP.forEach(entry => {
      const it = DATA.ITEMS[entry.itemId];
      const card = el('div', 'item');
      card.innerHTML = `
        <div class="item-ico">${it.icon}</div>
        <div class="item-name">${it.name}</div>
        <div class="item-meta">${it.desc}</div>
        <div class="item-meta">${entry.price} 🪙</div>
        <div class="item-actions">
          <button class="btn gold" ${state.player.coins < entry.price ? 'disabled' : ''}>Comprar</button>
        </div>
      `;
      card.querySelector('button').onclick = () => buyItem(entry);
      shopGrid.appendChild(card);
    });
    shop.appendChild(shopGrid);
    root.appendChild(shop);

    // Log curto
    const recent = el('div', 'card');
    recent.appendChild(h('h3 section-title', 'Atividade recente'));
    const log = el('div', 'log');
    state.log.slice(0, 8).forEach(row => {
      const r = el('div', `log-row ${row.kind || 'info'}`);
      r.innerHTML = `<span class="when">${fmtTime(row.when)}</span>${row.msg}`;
      log.appendChild(r);
    });
    if (state.log.length === 0) log.appendChild(h('p muted small', 'Nenhuma atividade ainda. Comece pelo Mestre Ariston (NPCs).'));
    recent.appendChild(log);
    root.appendChild(recent);
  }

  // --- Missões
  function renderMissoes(root) {
    // Principal
    const card = el('div', 'card');
    card.appendChild(h('h3 section-title', 'Missão Principal'));
    const main = DATA.MAIN_QUEST;
    const mainQuest = el('div', 'quest');
    const totalSteps = main.steps.length;
    const doneSteps = state.main.completedSteps.length;
    mainQuest.innerHTML = `
      <div class="quest-head">
        <div>
          <div class="quest-title">${main.title} <span class="tag main">PRINCIPAL</span></div>
          <div class="quest-meta">${doneSteps}/${totalSteps} etapas</div>
        </div>
      </div>
      <div class="quest-desc">${main.desc}</div>
    `;
    const stepsBox = el('div', 'steps');
    main.steps.forEach((step, idx) => {
      const isDone = state.main.completedSteps.includes(step.id);
      const isCurrent = idx === state.main.currentStep && !state.main.done;
      const row = el('div', `step ${isDone ? 'done' : ''}`);
      const prog = step.progressMax ? (state.main.stepsProgress[step.id] || 0) : null;
      const progLabel = prog != null ? ` (${prog}/${step.progressMax} ${step.progressLabel})` : '';
      row.innerHTML = `<span>${isDone ? '✅' : isCurrent ? '⏳' : '🔒'} ${step.title}${progLabel}</span>`;
      if (isCurrent) {
        if (step.progressMax) {
          const btn = el('button', 'small-btn');
          btn.textContent = '+1';
          btn.onclick = () => mainStepProgress(step);
          row.appendChild(btn);
          if ((state.main.stepsProgress[step.id] || 0) >= step.progressMax) {
            const cbtn = el('button', 'small-btn');
            cbtn.textContent = 'Concluir';
            cbtn.onclick = () => completeMainStep(step);
            row.appendChild(cbtn);
          }
        } else if (step.boss) {
          const btn = el('button', 'small-btn');
          const bossDef = state.bosses[step.boss]?.defeated;
          btn.textContent = bossDef ? 'Concluir' : 'Ir ao Boss';
          btn.onclick = () => {
            if (bossDef) completeMainStep(step);
            else { state.ui.tab = 'bosses'; save(); render(); }
          };
          row.appendChild(btn);
        } else {
          const btn = el('button', 'small-btn');
          btn.textContent = 'Concluir';
          btn.onclick = () => completeMainStep(step);
          row.appendChild(btn);
        }
      }
      stepsBox.appendChild(row);
    });
    mainQuest.appendChild(stepsBox);
    card.appendChild(mainQuest);
    root.appendChild(card);

    // Diárias
    const dailyCard = el('div', 'card');
    dailyCard.appendChild(h('h3 section-title', 'Missões Diárias'));
    const dailyGrid = el('div', '');
    dailyGrid.style.display = 'grid';
    dailyGrid.style.gap = '8px';
    DATA.DAILY_QUESTS.forEach(d => {
      const done = state.dailies[d.id]?.done;
      const row = el('div', `daily-row ${done ? 'done' : ''}`);
      row.innerHTML = `
        <div class="daily-info">
          <div class="title">${d.icon} ${d.title} <span class="tag daily">DIÁRIA</span></div>
          <div class="meta">${d.desc}</div>
          <div class="meta">Recompensa: +${d.xp} XP, +${d.coins} 🪙${d.energyCost ? ` · Custo: ${d.energyCost} ⚡` : ''}${d.hpHeal ? ` · Cura ${d.hpHeal} ❤️` : ''}${d.energyHeal ? ` · Cura ${d.energyHeal} ⚡` : ''}</div>
        </div>
        <div>
          <button class="btn ${done ? 'ghost' : 'primary'}" ${done ? 'disabled' : ''}>${done ? '✓ Feito' : 'Completar'}</button>
        </div>
      `;
      row.querySelector('button').onclick = () => completeDaily(d);
      dailyGrid.appendChild(row);
    });
    dailyCard.appendChild(dailyGrid);
    root.appendChild(dailyCard);

    // Side quests
    const sideCard = el('div', 'card');
    sideCard.appendChild(h('h3 section-title', 'Missões Secundárias'));
    const sideGrid = el('div', '');
    sideGrid.style.display = 'grid';
    sideGrid.style.gap = '8px';
    DATA.SIDE_QUESTS.forEach(q => {
      const st = state.sides[q.id] || { progress: 0, done: false };
      const row = el('div', `quest ${st.done ? 'done' : ''}`);
      const npc = DATA.NPCS.find(n => n.id === q.npc);
      row.innerHTML = `
        <div class="quest-head">
          <div>
            <div class="quest-title">${q.title} <span class="tag side">SECUNDÁRIA</span></div>
            <div class="quest-meta">de ${npc ? npc.name : '—'} · +${q.xp} XP, +${q.coins} 🪙</div>
          </div>
        </div>
        <div class="quest-desc">${q.desc}</div>
      `;
      const actions = el('div', 'quest-actions');
      if (!st.done) {
        if (q.progressMax) {
          const lbl = el('span', 'quest-meta');
          lbl.textContent = `${st.progress}/${q.progressMax} ${q.progressLabel}`;
          actions.appendChild(lbl);
          const inc = el('button', 'btn');
          inc.textContent = '+1';
          inc.onclick = () => sideProgress(q);
          actions.appendChild(inc);
          if (st.progress >= q.progressMax) {
            const done = el('button', 'btn primary');
            done.textContent = 'Concluir';
            done.onclick = () => completeSide(q);
            actions.appendChild(done);
          }
        } else {
          const done = el('button', 'btn primary');
          done.textContent = 'Concluir';
          done.onclick = () => completeSide(q);
          actions.appendChild(done);
        }
      } else {
        actions.appendChild(h('span muted small', '✅ Concluída'));
      }
      row.appendChild(actions);
      sideGrid.appendChild(row);
    });
    sideCard.appendChild(sideGrid);
    root.appendChild(sideCard);
  }

  // --- NPCs
  function renderNpcs(root) {
    const card = el('div', 'card');
    card.appendChild(h('h3 section-title', 'NPCs da Academia'));
    const grid = el('div', 'grid-2');
    DATA.NPCS.forEach(npc => {
      const card = el('div', 'npc');
      card.innerHTML = `
        <div class="avatar">${npc.avatar}</div>
        <div class="npc-body">
          <div class="npc-name">${npc.name}</div>
          <div class="npc-role">${npc.role}</div>
          <div class="npc-quote">"${npc.quote}"</div>
        </div>
      `;
      card.onclick = () => openNpcDialogue(npc);
      grid.appendChild(card);
    });
    card.appendChild(grid);
    root.appendChild(card);
  }

  // --- Bosses
  function renderBosses(root) {
    const card = el('div', 'card');
    card.appendChild(h('h3 section-title', 'Combates Disponíveis'));
    const list = el('div', '');
    list.style.display = 'grid';
    list.style.gap = '12px';

    DATA.BOSSES.forEach(b => {
      const bs = state.bosses[b.id] || { hp: b.maxHp, defeated: false };
      const card = el('div', `boss ${bs.defeated ? 'defeated' : ''}`);
      const pct = Math.max(0, (bs.hp / b.maxHp) * 100);
      card.innerHTML = `
        <div class="boss-head">
          <div class="avatar">${b.avatar}</div>
          <div>
            <div class="boss-title">${b.name} <span class="tag boss">BOSS</span></div>
            <div class="boss-sub">${b.sub}</div>
          </div>
        </div>
        <div class="boss-hp">
          <div class="boss-hp-fill" style="width: ${pct}%"></div>
          <div class="boss-hp-text">${bs.hp} / ${b.maxHp} HP</div>
        </div>
        <div class="boss-actions"></div>
      `;
      const actions = card.querySelector('.boss-actions');
      if (!bs.defeated) {
        const attack = el('button', 'btn primary');
        attack.textContent = `⚔️ ${b.attackLabel}`;
        attack.onclick = () => attackBoss(b);
        if (state.player.energy < b.energyCost) attack.disabled = true;
        actions.appendChild(attack);
        const meta = h('span muted small', `Custo: ${b.energyCost} ⚡`);
        actions.appendChild(meta);
      } else {
        actions.appendChild(h('span muted small', '☠️ Derrotado'));
      }
      list.appendChild(card);
    });
    card.appendChild(list);
    root.appendChild(card);
  }

  // --- Inventário
  function renderInventario(root) {
    const card = el('div', 'card');
    card.appendChild(h('h3 section-title', 'Inventário'));
    const items = Object.entries(state.inventory).filter(([, c]) => c > 0);
    if (items.length === 0) {
      card.appendChild(h('p muted small', 'Vazio. Derrote bosses e complete missões para ganhar itens.'));
    } else {
      const grid = el('div', 'inv-grid');
      items.forEach(([id, count]) => {
        const it = DATA.ITEMS[id];
        if (!it) return;
        const c = el('div', 'item');
        c.innerHTML = `
          <div class="item-ico">${it.icon}</div>
          <div class="item-name">${it.name} <span class="muted small">×${count}</span></div>
          <div class="item-meta">${it.desc}</div>
        `;
        const actions = el('div', 'item-actions');
        if (it.use) {
          const btn = el('button', 'btn');
          btn.textContent = 'Usar';
          btn.onclick = () => useItem(id);
          actions.appendChild(btn);
        }
        c.appendChild(actions);
        grid.appendChild(c);
      });
      card.appendChild(grid);
    }
    root.appendChild(card);
  }

  // --- Diário (log completo)
  function renderDiario(root) {
    const card = el('div', 'card');
    card.appendChild(h('h3 section-title', 'Diário de Jornada'));
    const log = el('div', 'log');
    if (state.log.length === 0) {
      log.appendChild(h('p muted small', 'Sem registros.'));
    } else {
      state.log.forEach(row => {
        const r = el('div', `log-row ${row.kind || 'info'}`);
        r.innerHTML = `<span class="when">${fmtDateTime(row.when)}</span>${row.msg}`;
        log.appendChild(r);
      });
    }
    card.appendChild(log);
    root.appendChild(card);
  }

  // ----------------- Ações -----------------
  function completeDaily(d) {
    if (state.dailies[d.id]?.done) return;
    if (d.energyCost && state.player.energy < d.energyCost) {
      toast('Energia insuficiente! Descanse.', 'bad'); return;
    }
    updateState(s => {
      if (d.energyCost) s.player.energy -= d.energyCost;
      s.dailies[d.id] = { done: true };
      const msgs = applyReward(s.player, d, 'daily');
      addLog({ kind: 'good', msg: `✅ Diária: <em>${d.title}</em> · ${msgs.join(' ')}` });
    });
    toast(`Diária completa: ${d.title}`, 'good');
  }

  function mainStepProgress(step) {
    if (state.player.energy < 2) { toast('Sem energia!', 'bad'); return; }
    updateState(s => {
      s.player.energy -= 2;
      const cur = s.main.stepsProgress[step.id] || 0;
      const next = Math.min(step.progressMax, cur + 1);
      s.main.stepsProgress[step.id] = next;
      // micro-recompensa
      gainXp(s.player, 5);
      addLog({ kind: 'info', msg: `📈 Progresso em <em>${step.title}</em>: ${next}/${step.progressMax}` });
    });
  }

  function completeMainStep(step) {
    if (state.main.completedSteps.includes(step.id)) return;
    if (step.progressMax && (state.main.stepsProgress[step.id] || 0) < step.progressMax) {
      toast('Etapa ainda não está completa.', 'bad'); return;
    }
    if (step.boss && !state.bosses[step.boss]?.defeated) {
      toast('Derrote o boss desta etapa primeiro!', 'bad'); return;
    }
    updateState(s => {
      s.main.completedSteps.push(step.id);
      s.main.currentStep = Math.min(s.main.currentStep + 1, DATA.MAIN_QUEST.steps.length);
      const msgs = applyReward(s.player, step, 'main:enem');
      addLog({ kind: 'epic', msg: `🏁 Etapa concluída: <em>${step.title}</em> · ${msgs.join(' ')}` });
      if (s.main.currentStep >= DATA.MAIN_QUEST.steps.length) {
        s.main.done = true;
        addLog({ kind: 'epic', msg: '🎓 VOCÊ CONQUISTOU O ENEM. A jornada continua...' });
      }
    });
    toast('Etapa principal concluída!', 'epic');
  }

  function sideProgress(q) {
    if (state.player.energy < 1) { toast('Sem energia!', 'bad'); return; }
    updateState(s => {
      s.player.energy -= 1;
      const st = s.sides[q.id] || { progress: 0, done: false };
      st.progress = Math.min(q.progressMax, st.progress + 1);
      s.sides[q.id] = st;
      addLog({ kind: 'info', msg: `📈 Progresso em <em>${q.title}</em>: ${st.progress}/${q.progressMax}` });
    });
  }

  function completeSide(q) {
    if (state.sides[q.id]?.done) return;
    if (q.progressMax && (state.sides[q.id]?.progress || 0) < q.progressMax) {
      toast('Missão ainda não está completa.', 'bad'); return;
    }
    updateState(s => {
      s.sides[q.id] = { ...(s.sides[q.id] || { progress: q.progressMax || 0 }), done: true };
      const msgs = applyReward(s.player, q, 'side');
      addLog({ kind: 'good', msg: `✅ Secundária: <em>${q.title}</em> · ${msgs.join(' ')}` });
    });
    toast(`Missão secundária concluída!`, 'good');
  }

  function attackBoss(b) {
    if (state.player.energy < b.energyCost) { toast('Sem energia!', 'bad'); return; }
    updateState(s => {
      s.player.energy -= b.energyCost;
      const bs = s.bosses[b.id] || { hp: b.maxHp, defeated: false };
      bs.hp = Math.max(0, bs.hp - b.attackDmg);
      // pequeno contra-ataque (fadiga mental)
      const counter = 5;
      s.player.hp = Math.max(0, s.player.hp - counter);
      s.bosses[b.id] = bs;
      addLog({ kind: 'info', msg: `⚔️ Ataque em <em>${b.name}</em>: -${b.attackDmg} HP (boss). Você perdeu ${counter} ❤️.` });
      if (bs.hp <= 0) {
        bs.defeated = true;
        const msgs = applyReward(s.player, b.rewards, 'boss');
        // bônus passivo de item
        if (b.rewards.item) {
          const it = DATA.ITEMS[b.rewards.item];
          if (it && it.passive) {
            for (const [k, v] of Object.entries(it.passive)) {
              s.passives[k] = (s.passives[k] || 0) + v;
            }
          }
        }
        addLog({ kind: 'epic', msg: `☠️ Você derrotou <em>${b.name}</em>! ${msgs.join(' ')}` });
        toast(`${b.name} derrotado!`, 'epic');
      } else if (s.player.hp === 0) {
        s.player.hp = 1;
        addLog({ kind: 'bad', msg: '💀 Você quase desmaiou de exaustão. Descanse!' });
      }
    });
  }

  function buyItem(entry) {
    if (state.player.coins < entry.price) { toast('Moedas insuficientes!', 'bad'); return; }
    updateState(s => {
      s.player.coins -= entry.price;
      s.inventory[entry.itemId] = (s.inventory[entry.itemId] || 0) + 1;
      const it = DATA.ITEMS[entry.itemId];
      addLog({ kind: 'info', msg: `🛒 Comprou <em>${it.name}</em> por ${entry.price} 🪙` });
    });
    toast('Item comprado.', 'good');
  }

  function useItem(itemId) {
    const it = DATA.ITEMS[itemId];
    if (!it || !it.use) return;
    if ((state.inventory[itemId] || 0) <= 0) return;
    updateState(s => {
      s.inventory[itemId] -= 1;
      const msgs = applyReward(s.player, it.use, 'item');
      addLog({ kind: 'good', msg: `🧪 Usou <em>${it.name}</em> · ${msgs.join(' ')}` });
    });
  }

  function rest() {
    // Restaura energia e parte do HP, mas custa o resto do dia (sem efeito real, simbólico)
    updateState(s => {
      s.player.energy = s.player.maxEnergy;
      s.player.hp = Math.min(s.player.maxHp, s.player.hp + Math.floor(s.player.maxHp * 0.5));
      addLog({ kind: 'info', msg: `💤 Você descansou. Energia restaurada, HP recuperado.` });
    });
    toast('Descansado.', 'good');
  }

  function resetGame() {
    showModal({
      title: 'Reiniciar jogo?',
      body: 'Isso apaga seu personagem e todo o progresso salvo neste navegador.',
      actions: [
        { label: 'Cancelar', kind: 'ghost', onClick: hideModal },
        { label: 'Sim, reiniciar', kind: 'primary', onClick: () => {
          localStorage.removeItem(STORAGE_KEY);
          state = null;
          hideModal();
          render();
        }},
      ],
    });
  }

  // ----------------- Diálogo NPC -----------------
  function openNpcDialogue(npc) {
    const offers = (npc.gives || []).map(qid => {
      const q = DATA.SIDE_QUESTS.find(s => s.id === qid) || (qid === DATA.MAIN_QUEST.id ? DATA.MAIN_QUEST : null);
      return { qid, q };
    }).filter(x => x.q);

    const body = document.createElement('div');
    body.innerHTML = `
      <div class="row">
        <div class="avatar" style="font-size:32px">${npc.avatar}</div>
        <div>
          <div style="font-weight:700">${npc.name}</div>
          <div class="muted small">${npc.role}</div>
        </div>
      </div>
      <p>"${npc.dialogues[Math.floor(Math.random() * npc.dialogues.length)]}"</p>
    `;
    if (offers.length > 0) {
      const list = document.createElement('div');
      list.style.display = 'grid';
      list.style.gap = '6px';
      list.appendChild(h('div section-title', 'Missões oferecidas'));
      offers.forEach(({ qid, q }) => {
        const isMain = qid === DATA.MAIN_QUEST.id;
        const taken = isMain ? true : !!state.sides[qid];
        const r = el('div', 'step');
        r.innerHTML = `<span>${isMain ? '👑' : '📜'} ${q.title}</span><span class="muted small">${taken ? 'Já ativa' : 'Disponível'}</span>`;
        list.appendChild(r);
      });
      body.appendChild(list);
    }

    showModal({
      title: npc.name,
      bodyEl: body,
      actions: [{ label: 'Fechar', kind: 'primary', onClick: hideModal }],
    });
  }

  // ----------------- Modal/Toast helpers -----------------
  function showModal({ title, body, bodyEl, actions }) {
    const modal = document.getElementById('modal');
    const card = document.getElementById('modal-card');
    card.innerHTML = '';
    if (title) card.appendChild(h('h2', title));
    if (bodyEl) card.appendChild(bodyEl);
    else if (body) card.appendChild(h('p', body));
    if (actions) {
      const row = el('div', 'modal-row');
      actions.forEach(a => {
        const b = el('button', `btn ${a.kind || ''}`);
        b.textContent = a.label;
        b.onclick = a.onClick;
        row.appendChild(b);
      });
      card.appendChild(row);
    }
    modal.classList.remove('hidden');
  }

  function hideModal() {
    document.getElementById('modal').classList.add('hidden');
  }

  function toast(msg, kind) {
    const c = document.getElementById('toast-container');
    const t = el('div', `toast ${kind || ''}`);
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }

  // ----------------- Helpers de DOM -----------------
  function el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }
  function h(tagWithClass, html) {
    const [tag, ...classes] = tagWithClass.split(' ');
    const e = document.createElement(tag);
    if (classes.length) e.className = classes.join(' ');
    e.innerHTML = html;
    return e;
  }
  function fmtTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function fmtDateTime(ts) {
    const d = new Date(ts);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  // ----------------- Boot -----------------
  function bindStaticEvents() {
    document.getElementById('btn-start').onclick = () => {
      const name = document.getElementById('input-name').value.trim() || 'Aventureiro';
      const cls = document.getElementById('input-class').value;
      state = defaultState(name, cls);
      // Missão principal já ativa
      addLog({ kind: 'epic', msg: `🌟 ${name} iniciou sua jornada como ${DATA.CLASSES[cls].name}.` });
      addLog({ kind: 'info', msg: '🎯 Missão recebida: <em>A Jornada do ENEM</em>. Procure o Mestre Ariston em NPCs.' });
      checkDailyReset();
      save();
      render();
      toast(`Bem-vindo, ${name}!`, 'epic');
    };

    document.querySelectorAll('.tab').forEach(t => {
      t.onclick = () => { state.ui.tab = t.dataset.tab; save(); render(); };
    });

    document.getElementById('btn-rest').onclick = rest;
    document.getElementById('btn-reset').onclick = resetGame;
    document.getElementById('modal').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) hideModal();
    });
  }

  function boot() {
    bindStaticEvents();
    const saved = load();
    if (saved && saved.player) {
      state = saved;
      checkDailyReset();
      render();
    } else {
      render(); // mostra onboarding
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
