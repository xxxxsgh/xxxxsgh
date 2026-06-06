# 🏎️ Drift Rush

Jogo de corrida **top-down** com física de **derrapagem (drift)**, feito em
HTML5 Canvas + JavaScript puro — sem dependências, otimizado para **mobile**.

## Como jogar

Abra `racing/index.html` no navegador (celular ou desktop).

- **Mobile:** botões na tela — `GÁS` (acelerar), `DRIFT` (freio de mão),
  `‹` `›` (virar).
- **Desktop:** `↑` acelerar · `↓` freio/ré · `← →` virar · `ESPAÇO` drift.

Objetivo: passe por **todos os checkpoints** (gate azul) na ordem e complete
as **3 voltas** no menor tempo. Sua melhor volta fica salva no navegador.

## A física de drift

O segredo é separar a velocidade do carro em dois eixos locais:

- **longitudinal** (para frente/trás) — afetada pelo motor, freio e arrasto;
- **lateral** (de lado) — controlada por um fator de **aderência (grip)**.

A cada frame a velocidade lateral é multiplicada pelo grip:

- grip **baixo** (`gripNormal`) → o pneu "agarra", o carro segue a frente;
- grip **alto** (`gripDrift`, com o freio de mão) → a velocidade lateral
  persiste e o carro **desliza** para o lado = drift.

Quando o deslize lateral passa de um limiar, o carro deixa **marcas de pneu**
no asfalto e o HUD pisca `DRIFT!`. Fora da pista (grama) o atrito aumenta e o
carro perde velocidade.

Os parâmetros ficam no objeto `PHYS` em `game.js` — ajuste `gripDrift`,
`turnRate`, `engine` e `maxSpeed` para mudar a sensação de pilotagem.

## Arquivos

| arquivo       | papel                                            |
|---------------|--------------------------------------------------|
| `index.html`  | estrutura, HUD e controles touch                 |
| `style.css`   | visual, layout responsivo e botões mobile        |
| `game.js`     | pista (spline), física, checkpoints e render     |
