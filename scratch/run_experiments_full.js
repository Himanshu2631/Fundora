const fs = require('fs');
const path = require('path');

console.log('=' .repeat(80));
console.log('SAHAYATA AI RESEARCH: PHASE 3 - STEP 3 BASELINE MODEL EXPERIMENTS');
console.log('Dataset: Real MDCC Dataset (14,859 Clean Campaigns)');
console.log('Chronological Split: Train (10,401) | Val (2,228) | Test (2,230)');
console.log('=' .repeat(80));

const csvPath = path.join(__dirname, '..', 'ml', 'data', 'raw_data.csv');
const resultsDir = path.join(__dirname, '..', 'ml', 'experiments', 'results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

function parseList(str) {
  if (!str) return [];
  const trimmed = str.trim();
  if (trimmed === '[]' || trimmed === '') return [];
  try {
    return JSON.parse(trimmed.replace(/'/g, '"'));
  } catch (e) {
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return [];
      return inner.split(',').map(x => {
        const n = parseFloat(x.trim());
        return isNaN(n) ? x.trim() : n;
      });
    }
    return [];
  }
}

const CATEGORIES = ["Memorial", "Medical", "Animals", "Emergency", "Financial Emergency", "Other"];
const COUNTRIES = ["US", "CA", "GB", "AU", "OTHER"];

const POS_WORDS = new Set(["help", "support", "blessing", "love", "hope", "recovery", "life", "care", "cure", "thank", "family", "survive", "heal", "god", "pray", "kindness", "strength", "give", "community"]);
const NEG_WORDS = new Set(["cancer", "disease", "death", "tragedy", "loss", "funeral", "emergency", "crisis", "accident", "debt", "pain", "hardship", "suffering", "fire", "injury", "devastating", "urgent", "passed"]);

const topVocab = [
  "medical", "family", "cancer", "help", "support", "memorial", "emergency",
  "funeral", "surgery", "expenses", "accident", "community", "children", "loving",
  "hospital", "treatment", "recovery", "financial", "passed", "friends"
];

// Predefined idf weights for top terms
const idfMap = {};
topVocab.forEach((w, idx) => {
  idfMap[w] = 1.8 + (idx * 0.05);
});

function extractFeatures(rec) {
  // 1. Metadata Features (16)
  const meta = [];
  meta.push(rec.goal);
  meta.push(Math.log(1.0 + rec.goal));
  const lDay = rec.launchDate.getDay();
  meta.push(lDay);
  meta.push(rec.launchDate.getHours());
  meta.push(lDay === 0 || lDay === 6 ? 1.0 : 0.0);

  let matchedCat = false;
  for (let i = 0; i < CATEGORIES.length - 1; i++) {
    if (rec.category.toLowerCase() === CATEGORIES[i].toLowerCase()) { meta.push(1.0); matchedCat = true; }
    else meta.push(0.0);
  }
  meta.push(matchedCat ? 0.0 : 1.0);

  let matchedCty = false;
  for (let i = 0; i < COUNTRIES.length - 1; i++) {
    if (rec.country.toUpperCase() === COUNTRIES[i].toUpperCase()) { meta.push(1.0); matchedCty = true; }
    else meta.push(0.0);
  }
  meta.push(matchedCty ? 0.0 : 1.0);

  // 2. Text Features (28)
  const text = [];
  const desc = rec.desc || '';
  const dLen = desc.length;
  const words = desc.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const dWords = words.length;
  const sents = desc.split(/[.!?]+/).filter(Boolean).length || 1;
  const totalChars = words.reduce((acc, w) => acc + w.length, 0);
  const avgWLen = dWords > 0 ? totalChars / dWords : 0;
  const ari = dWords > 0 ? Math.max(0, Math.min(100, 4.71 * (totalChars / dWords) + 0.5 * (dWords / sents) - 21.43)) : 0;

  let posCnt = 0, negCnt = 0;
  for (const w of words) {
    if (POS_WORDS.has(w)) posCnt++;
    if (NEG_WORDS.has(w)) negCnt++;
  }
  const posRatio = dWords > 0 ? posCnt / dWords : 0;
  const negRatio = dWords > 0 ? negCnt / dWords : 0;
  const netPolarity = posRatio - negRatio;

  text.push(dLen, dWords, sents, avgWLen, ari, posRatio, negRatio, netPolarity);

  for (const w of topVocab) {
    const count = words.filter(x => x === w).length;
    const tf = dWords > 0 ? count / dWords : 0;
    text.push(tf * idfMap[w]);
  }

  // 3. Early Behavioural Features (9)
  const behav = [];
  let d24Count = 0, d24Amt = 0;
  let d48Count = 0, d48Amt = 0;

  for (let k = 0; k < rec.donationTimes.length; k++) {
    const sec = typeof rec.donationTimes[k] === 'number' ? rec.donationTimes[k] : parseFloat(rec.donationTimes[k]);
    const amt = typeof rec.donationAmts[k] === 'number' ? rec.donationAmts[k] : (parseFloat(rec.donationAmts[k]) || 0);
    if (!isNaN(sec) && sec <= 172800) {
      d48Count++;
      d48Amt += amt;
      if (sec <= 86400) { d24Count++; d24Amt += amt; }
    }
  }

  const earlyVel = d48Amt / 48.0;
  let u48Count = 0;
  for (const ut of rec.updateTimes) {
    const sec = typeof ut === 'number' ? ut : parseFloat(ut);
    if (!isNaN(sec) && sec <= 172800) u48Count++;
  }
  let c48Count = 0;
  for (const ct of rec.commentTimes) {
    const sec = typeof ct === 'number' ? ct : parseFloat(ct);
    if (!isNaN(sec) && sec <= 172800) c48Count++;
  }
  const cDensity = d48Count > 0 ? c48Count / d48Count : 0;
  const uFreq = u48Count / 48.0;

  behav.push(d24Count, d24Amt, d48Count, d48Amt, earlyVel, c48Count, cDensity, u48Count, uFreq);

  // 4. Image Features (3)
  const img = [rec.hasCover, rec.numBody, rec.hasCover + rec.numBody];

  return { meta, text, behav, img };
}

// Streaming Ingestion
console.log('\n[1/4] Streaming ingestion of real MDCC raw_data.csv...');
const rawRecords = [];
const seenIds = new Set();
let header = null;
let fieldMap = {};
let currentRow = [];
let currentField = '';
let inQuotes = false;

function processRow(row) {
  if (!header) {
    header = row.map(h => h.trim());
    header.forEach((h, idx) => { fieldMap[h] = idx; });
    return;
  }

  const cid = (row[fieldMap['campaign_id']] || '').trim();
  if (!cid || seenIds.has(cid)) return;

  const goal = parseFloat(row[fieldMap['goal']]);
  const raised = parseFloat(row[fieldMap['raised']]);
  const launchStr = (row[fieldMap['launch_date']] || '').trim();
  const launchDate = new Date(launchStr);
  if (isNaN(goal) || goal <= 0 || isNaN(raised) || raised < 0 || isNaN(launchDate.getTime())) return;

  seenIds.add(cid);
  const desc = (row[fieldMap['clean_description']] || row[fieldMap['raw_description']] || '').trim();
  const category = (row[fieldMap['category']] || 'Other').trim();
  const country = (row[fieldMap['country']] || 'US').trim();

  const coverStr = (row[fieldMap['cover_photo']] || '').trim().toLowerCase();
  const hasCover = coverStr === 'true' || coverStr === '1' || coverStr.includes('.jpg');
  const numBody = parseInt(row[fieldMap['num_photo_main_body']] || '0', 10) || 0;

  const donationTimes = parseList(row[fieldMap['donation_time']]);
  const donationAmts = parseList(row[fieldMap['donation_amount']]);
  const updateTimes = parseList(row[fieldMap['update_time']]);
  const commentTimes = parseList(row[fieldMap['comment_time']]);

  rawRecords.push({
    cid,
    launchEpoch: launchDate.getTime(),
    launchDate,
    goal,
    raised,
    category,
    country,
    desc,
    hasCover: hasCover ? 1.0 : 0.0,
    numBody: numBody,
    donationTimes,
    donationAmts,
    updateTimes,
    commentTimes,
    y: raised < goal ? 1 : 0
  });
}

const stream = fs.createReadStream(csvPath, { encoding: 'utf8', highWaterMark: 128 * 1024 });

stream.on('data', chunk => {
  for (let i = 0; i < chunk.length; i++) {
    const char = chunk[i];
    const nextChar = chunk[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') { currentField += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField);
      if (currentRow.length > 1 || currentRow[0] !== '') processRow(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
});

stream.on('end', () => {
  if (currentRow.length > 0 || currentField !== '') {
    currentRow.push(currentField);
    processRow(currentRow);
  }

  console.log(`-> Successfully ingested ${rawRecords.length} clean campaigns.`);

  // Chronological sorting
  rawRecords.sort((a, b) => a.launchEpoch - b.launchEpoch);

  console.log('\n[2/4] Extracting feature matrices...');
  const allFeatures = rawRecords.map(r => extractFeatures(r));

  const nTotal = rawRecords.length;
  const nTrain = Math.floor(nTotal * 0.70);
  const nVal = Math.floor(nTotal * 0.15);
  const nTest = nTotal - nTrain - nVal;

  const yAll = rawRecords.map(r => r.y);
  const yTrain = yAll.slice(0, nTrain);
  const yVal = yAll.slice(nTrain, nTrain + nVal);
  const yTest = yAll.slice(nTrain + nVal);

  const EXPERIMENTS = {
    "Exp A (Metadata only)": (f) => f.meta,
    "Exp B (Text only)": (f) => f.text,
    "Exp C (Metadata + Text)": (f) => [...f.meta, ...f.text],
    "Exp D (Metadata + Text + Early Behaviour)": (f) => [...f.meta, ...f.text, ...f.behav],
    "Exp E (All Features)": (f) => [...f.meta, ...f.text, ...f.behav, ...f.img]
  };

  function sigmoid(z) {
    if (z < -40.0) return 0.0;
    if (z > 40.0) return 1.0;
    return 1.0 / (1.0 + Math.exp(-z));
  }

  function calculateMetrics(yTrue, yProb, threshold = 0.5) {
    const yPred = yProb.map(p => p >= threshold ? 1 : 0);
    let tp = 0, fp = 0, tn = 0, fn = 0;
    for (let i = 0; i < yTrue.length; i++) {
      const yt = yTrue[i], yp = yPred[i];
      if (yt === 1 && yp === 1) tp++;
      else if (yt === 0 && yp === 1) fp++;
      else if (yt === 0 && yp === 0) tn++;
      else if (yt === 1 && yp === 0) fn++;
    }

    const n = yTrue.length;
    const accuracy = (tp + tn) / n;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    const posCount = yTrue.filter(y => y === 1).length;
    const negCount = n - posCount;
    let rocAuc = 0.5;
    if (posCount > 0 && negCount > 0) {
      const paired = yProb.map((p, idx) => ({ p, y: yTrue[idx] })).sort((a, b) => a.p - b.p);
      let rankSumPos = 0;
      let i = 0;
      while (i < n) {
        let j = i;
        while (j < n && paired[j].p === paired[i].p) j++;
        const avgRank = (i + 1 + j) / 2.0;
        for (let k = i; k < j; k++) {
          if (paired[k].y === 1) rankSumPos += avgRank;
        }
        i = j;
      }
      const uPos = rankSumPos - (posCount * (posCount + 1)) / 2.0;
      rocAuc = uPos / (posCount * negCount);
    }

    const pairedDesc = yProb.map((p, idx) => ({ p, y: yTrue[idx] })).sort((a, b) => b.p - a.p);
    let curTp = 0, curFp = 0;
    let prAuc = 0, prevRec = 0;
    for (let i = 0; i < n; i++) {
      if (pairedDesc[i].y === 1) curTp++;
      else curFp++;
      const prec = curTp / (curTp + curFp);
      const rec = curTp / posCount;
      const deltaR = rec - prevRec;
      if (deltaR > 0) {
        prAuc += prec * deltaR;
        prevRec = rec;
      }
    }

    let logLoss = 0, brier = 0;
    const eps = 1e-15;
    for (let i = 0; i < n; i++) {
      const yt = yTrue[i];
      const p = Math.max(eps, Math.min(1.0 - eps, yProb[i]));
      logLoss += -(yt * Math.log(p) + (1 - yt) * Math.log(1 - p));
      brier += Math.pow(yProb[i] - yt, 2);
    }
    logLoss /= n;
    brier /= n;

    return {
      accuracy: Number(accuracy.toFixed(4)),
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      f1_score: Number(f1.toFixed(4)),
      roc_auc: Number(rocAuc.toFixed(4)),
      pr_auc: Number(prAuc.toFixed(4)),
      log_loss: Number(logLoss.toFixed(4)),
      brier_score: Number(brier.toFixed(4)),
      cm: { TP: tp, FP: fp, TN: tn, FN: fn }
    };
  }

  // 1. Logistic Regression
  class LogisticRegression {
    fit(X, y) {
      const n = X.length, p = X[0].length;
      this.means = new Float64Array(p);
      this.stds = new Float64Array(p);
      for (let j = 0; j < p; j++) {
        let m = 0;
        for (let i = 0; i < n; i++) m += X[i][j];
        m /= n;
        let v = 0;
        for (let i = 0; i < n; i++) v += Math.pow(X[i][j] - m, 2);
        this.means[j] = m;
        this.stds[j] = Math.sqrt(v / n) > 1e-6 ? Math.sqrt(v / n) : 1.0;
      }
      this.weights = new Float64Array(p);
      this.bias = 0.0;
      const nPos = y.filter(yi => yi === 1).length;
      const nNeg = n - nPos;
      const wPos = n / (2.0 * nPos);
      const wNeg = n / (2.0 * nNeg);

      for (let ep = 0; ep < 100; ep++) {
        const gradW = new Float64Array(p);
        let gradB = 0;
        for (let i = 0; i < n; i++) {
          let z = this.bias;
          for (let j = 0; j < p; j++) z += this.weights[j] * ((X[i][j] - this.means[j]) / this.stds[j]);
          const prob = sigmoid(z);
          const err = (prob - y[i]) * (y[i] === 1 ? wPos : wNeg);
          for (let j = 0; j < p; j++) gradW[j] += err * ((X[i][j] - this.means[j]) / this.stds[j]);
          gradB += err;
        }
        for (let j = 0; j < p; j++) {
          this.weights[j] -= 0.05 * (gradW[j] / n + 0.01 * this.weights[j]);
        }
        this.bias -= 0.05 * (gradB / n);
      }
    }
    predictProba(X) {
      const n = X.length, p = X[0].length;
      const probs = [];
      for (let i = 0; i < n; i++) {
        let z = this.bias;
        for (let j = 0; j < p; j++) z += this.weights[j] * ((X[i][j] - this.means[j]) / this.stds[j]);
        probs.push(sigmoid(z));
      }
      return probs;
    }
  }

  // 2. Random Forest
  class RandomForest {
    fit(X, y) {
      const n = X.length, p = X[0].length;
      this.trees = [];
      const nPos = y.filter(yi => yi === 1).length;
      const wPos = n / (2.0 * nPos);
      const wNeg = n / (2.0 * (n - nPos));
      const weights = y.map(yi => yi === 1 ? wPos : wNeg);

      for (let t = 0; t < 35; t++) {
        const bootIdx = [];
        for (let i = 0; i < n; i++) bootIdx.push(Math.floor(Math.random() * n));
        const Xb = bootIdx.map(i => X[i]);
        const yb = bootIdx.map(i => y[i]);
        const wb = bootIdx.map(i => weights[i]);
        this.trees.push(this._buildTree(Xb, yb, wb, 0, p));
      }
    }
    _buildTree(X, y, w, depth, p) {
      const n = y.length;
      let totalW = 0, wPos = 0;
      for (let i = 0; i < n; i++) { totalW += w[i]; if (y[i] === 1) wPos += w[i]; }
      const prob = totalW > 0 ? wPos / totalW : 0.5;
      if (depth >= 6 || n < 20 || prob === 0 || prob === 1) return { leaf: true, value: prob };

      const featCount = Math.max(1, Math.floor(Math.sqrt(p) * 1.5));
      const featIndices = [];
      while (featIndices.length < featCount) {
        const idx = Math.floor(Math.random() * p);
        if (!featIndices.includes(idx)) featIndices.push(idx);
      }

      let bestGini = Infinity, bestF = -1, bestThresh = 0, bestLeft = null, bestRight = null;
      for (const fIdx of featIndices) {
        const vals = X.map(r => r[fIdx]);
        const sorted = Array.from(new Set(vals)).sort((a, b) => a - b);
        if (sorted.length <= 1) continue;
        const step = Math.max(1, Math.floor(sorted.length / 6));
        for (let k = 0; k < sorted.length; k += step) {
          const thresh = sorted[k];
          const leftIdx = [], rightIdx = [];
          for (let i = 0; i < n; i++) {
            if (X[i][fIdx] <= thresh) leftIdx.push(i);
            else rightIdx.push(i);
          }
          if (!leftIdx.length || !rightIdx.length) continue;
          let wL = 0, wR = 0, posL = 0, posR = 0;
          for (const i of leftIdx) { wL += w[i]; if (y[i] === 1) posL += w[i]; }
          for (const i of rightIdx) { wR += w[i]; if (y[i] === 1) posR += w[i]; }
          const gL = 1.0 - (Math.pow(posL / wL, 2) + Math.pow(1 - posL / wL, 2));
          const gR = 1.0 - (Math.pow(posR / wR, 2) + Math.pow(1 - posR / wR, 2));
          const gini = (wL / totalW) * gL + (wR / totalW) * gR;
          if (gini < bestGini) {
            bestGini = gini; bestF = fIdx; bestThresh = thresh;
            bestLeft = leftIdx; bestRight = rightIdx;
          }
        }
      }
      if (bestF === -1) return { leaf: true, value: prob };
      return {
        leaf: false, fIdx: bestF, thresh: bestThresh,
        left: this._buildTree(bestLeft.map(i => X[i]), bestLeft.map(i => y[i]), bestLeft.map(i => w[i]), depth + 1, p),
        right: this._buildTree(bestRight.map(i => X[i]), bestRight.map(i => y[i]), bestRight.map(i => w[i]), depth + 1, p)
      };
    }
    _predictRow(row, node) {
      if (node.leaf) return node.value;
      if (row[node.fIdx] <= node.thresh) return this._predictRow(row, node.left);
      return this._predictRow(row, node.right);
    }
    predictProba(X) {
      return X.map(row => {
        let sum = 0;
        for (const t of this.trees) sum += this._predictRow(row, t);
        return sum / this.trees.length;
      });
    }
  }

  // 3. XGBoost
  class XGBoost {
    fit(X, y) {
      const n = X.length, p = X[0].length;
      const nPos = y.filter(yi => yi === 1).length;
      const nNeg = n - nPos;
      const scalePosWeight = nNeg / (nPos || 1);
      const pInit = (nPos * scalePosWeight) / (nNeg + nPos * scalePosWeight);
      this.baseScore = Math.log(Math.max(1e-4, pInit) / Math.max(1e-4, 1.0 - pInit));
      const raw = new Float64Array(n).fill(this.baseScore);
      this.trees = [];

      for (let t = 0; t < 35; t++) {
        const residuals = new Float64Array(n);
        for (let i = 0; i < n; i++) {
          const prob = sigmoid(raw[i]);
          residuals[i] = (y[i] === 1 ? scalePosWeight : 1.0) * (y[i] - prob);
        }
        const root = this._buildRegTree(X, residuals, 0, p);
        this.trees.push(root);
        for (let i = 0; i < n; i++) raw[i] += 0.1 * this._predictRow(X[i], root);
      }
    }
    _buildRegTree(X, res, depth, p) {
      const n = res.length;
      let sumRes = 0;
      for (let i = 0; i < n; i++) sumRes += res[i];
      const mean = n > 0 ? sumRes / n : 0;
      if (depth >= 4 || n < 20) return { leaf: true, value: mean };

      const featCount = Math.max(1, Math.floor(Math.sqrt(p) * 1.5));
      const featIndices = [];
      while (featIndices.length < featCount) {
        const idx = Math.floor(Math.random() * p);
        if (!featIndices.includes(idx)) featIndices.push(idx);
      }
      let bestVarRed = -1, bestF = -1, bestThresh = 0, bestLeft = null, bestRight = null;
      let totalVar = 0;
      for (let i = 0; i < n; i++) totalVar += Math.pow(res[i] - mean, 2);

      for (const fIdx of featIndices) {
        const vals = X.map(r => r[fIdx]);
        const sorted = Array.from(new Set(vals)).sort((a, b) => a - b);
        if (sorted.length <= 1) continue;
        const step = Math.max(1, Math.floor(sorted.length / 6));
        for (let k = 0; k < sorted.length; k += step) {
          const thresh = sorted[k];
          const leftIdx = [], rightIdx = [];
          for (let i = 0; i < n; i++) {
            if (X[i][fIdx] <= thresh) leftIdx.push(i);
            else rightIdx.push(i);
          }
          if (!leftIdx.length || !rightIdx.length) continue;
          let sumL = 0, sumR = 0;
          for (const i of leftIdx) sumL += res[i];
          for (const i of rightIdx) sumR += res[i];
          const mL = sumL / leftIdx.length, mR = sumR / rightIdx.length;
          let vL = 0, vR = 0;
          for (const i of leftIdx) vL += Math.pow(res[i] - mL, 2);
          for (const i of rightIdx) vR += Math.pow(res[i] - mR, 2);
          const varRed = totalVar - (vL + vR);
          if (varRed > bestVarRed) {
            bestVarRed = varRed; bestF = fIdx; bestThresh = thresh;
            bestLeft = leftIdx; bestRight = rightIdx;
          }
        }
      }
      if (bestF === -1) return { leaf: true, value: mean };
      return {
        leaf: false, fIdx: bestF, thresh: bestThresh,
        left: this._buildRegTree(bestLeft.map(i => X[i]), bestLeft.map(i => res[i]), depth + 1, p),
        right: this._buildRegTree(bestRight.map(i => X[i]), bestRight.map(i => res[i]), depth + 1, p)
      };
    }
    _predictRow(row, node) {
      if (node.leaf) return node.value;
      if (row[node.fIdx] <= node.thresh) return this._predictRow(row, node.left);
      return this._predictRow(row, node.right);
    }
    predictProba(X) {
      return X.map(row => {
        let raw = this.baseScore;
        for (const t of this.trees) raw += 0.1 * this._predictRow(row, t);
        return sigmoid(raw);
      });
    }
  }

  // 4. SVM
  class SVM {
    fit(X, y) {
      const n = X.length, p = X[0].length;
      this.means = new Float64Array(p);
      this.stds = new Float64Array(p);
      for (let j = 0; j < p; j++) {
        let m = 0;
        for (let i = 0; i < n; i++) m += X[i][j];
        m /= n;
        let v = 0;
        for (let i = 0; i < n; i++) v += Math.pow(X[i][j] - m, 2);
        this.means[j] = m;
        this.stds[j] = Math.sqrt(v / n) > 1e-6 ? Math.sqrt(v / n) : 1.0;
      }
      this.weights = new Float64Array(p);
      this.bias = 0.0;
      const nPos = y.filter(yi => yi === 1).length;
      const wPos = n / (2.0 * nPos);
      const wNeg = n / (2.0 * (n - nPos));

      for (let ep = 1; ep <= 60; ep++) {
        const eta = 0.02 / Math.sqrt(ep);
        for (let i = 0; i < n; i++) {
          let margin = this.bias;
          for (let j = 0; j < p; j++) margin += this.weights[j] * ((X[i][j] - this.means[j]) / this.stds[j]);
          const ySvm = y[i] === 1 ? 1.0 : -1.0;
          const sw = y[i] === 1 ? wPos : wNeg;
          if (ySvm * margin < 1.0) {
            for (let j = 0; j < p; j++) {
              this.weights[j] = (1.0 - eta) * this.weights[j] + eta * 1.0 * sw * ySvm * ((X[i][j] - this.means[j]) / this.stds[j]);
            }
            this.bias += eta * 1.0 * sw * ySvm;
          } else {
            for (let j = 0; j < p; j++) this.weights[j] = (1.0 - eta) * this.weights[j];
          }
        }
      }

      this.plattA = 1.0;
      this.plattB = 0.0;
      for (let it = 0; it < 25; it++) {
        let gradA = 0, gradB = 0;
        for (let i = 0; i < n; i++) {
          let margin = this.bias;
          for (let j = 0; j < p; j++) margin += this.weights[j] * ((X[i][j] - this.means[j]) / this.stds[j]);
          const prob = sigmoid(this.plattA * margin + this.plattB);
          const err = prob - y[i];
          gradA += err * margin;
          gradB += err;
        }
        this.plattA -= 0.01 * (gradA / n);
        this.plattB -= 0.01 * (gradB / n);
      }
    }
    predictProba(X) {
      return X.map(row => {
        let margin = this.bias;
        for (let j = 0; j < row.length; j++) margin += this.weights[j] * ((row[j] - this.means[j]) / this.stds[j]);
        return sigmoid(this.plattA * margin + this.plattB);
      });
    }
  }

  console.log('\n[3/4] Running 5 Feature-Group Experiments across 4 Baseline Models on Real MDCC Dataset...');
  const fullResults = {};
  const summaryTable = [];

  for (const [expName, featSelector] of Object.entries(EXPERIMENTS)) {
    console.log(`\n>>> ${expName}`);
    const X_all = allFeatures.map(featSelector);
    const featDim = X_all[0].length;
    console.log(`    Feature Dimension: ${featDim}`);

    const X_train = X_all.slice(0, nTrain);
    const X_val = X_all.slice(nTrain, nTrain + nVal);
    const X_test = X_all.slice(nTrain + nVal);

    const models = {
      "Logistic Regression": new LogisticRegression(),
      "Random Forest": new RandomForest(),
      "XGBoost": new XGBoost(),
      "SVM": new SVM()
    };

    fullResults[expName] = { feature_dim: featDim, models: {} };

    for (const [mName, model] of Object.entries(models)) {
      model.fit(X_train, yTrain);

      const probVal = model.predictProba(X_val);
      const probTest = model.predictProba(X_test);

      const mVal = calculateMetrics(yVal, probVal);
      const mTest = calculateMetrics(yTest, probTest);

      fullResults[expName].models[mName] = {
        val_metrics: mVal,
        test_metrics: mTest
      };

      summaryTable.push({
        experiment: expName,
        feature_count: featDim,
        model: mName,
        val_roc_auc: mVal.roc_auc,
        val_pr_auc: mVal.pr_auc,
        val_f1: mVal.f1_score,
        val_recall: mVal.recall,
        val_brier: mVal.brier_score,
        test_accuracy: mTest.accuracy,
        test_precision: mTest.precision,
        test_recall: mTest.recall,
        test_f1: mTest.f1_score,
        test_roc_auc: mTest.roc_auc,
        test_pr_auc: mTest.pr_auc,
        test_log_loss: mTest.log_loss,
        test_brier: mTest.brier_score
      });

      console.log(`      ${mName.padEnd(20)} | VAL  ROC-AUC: ${mVal.roc_auc.toFixed(4)} | PR-AUC: ${mVal.pr_auc.toFixed(4)} | F1: ${mVal.f1_score.toFixed(4)}`);
      console.log(`      ${''.padEnd(20)} | TEST ROC-AUC: ${mTest.roc_auc.toFixed(4)} | PR-AUC: ${mTest.pr_auc.toFixed(4)} | F1: ${mTest.f1_score.toFixed(4)} | Recall: ${mTest.recall.toFixed(4)} | Acc: ${mTest.accuracy.toFixed(4)}`);
    }
  }

  console.log('\n[4/4] Writing experiment results to CSV and JSON...');
  const jsonPath = path.join(resultsDir, 'baseline_results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(fullResults, null, 2));

  const csvOutPath = path.join(resultsDir, 'model_comparison.csv');
  const csvHeaders = Object.keys(summaryTable[0]).join(',');
  const csvRows = summaryTable.map(row => Object.values(row).join(','));
  fs.writeFileSync(csvOutPath, [csvHeaders, ...csvRows].join('\n'));

  // Sort by Validation Performance (PR-AUC + ROC-AUC)
  const sorted = [...summaryTable].sort((a, b) => (b.val_pr_auc + b.val_roc_auc) - (a.val_pr_auc + a.val_roc_auc));
  const best = sorted[0];

  console.log('\n' + '='.repeat(80));
  console.log('PHASE 3 - STEP 3 BASELINE MODEL EVALUATION COMPLETE');
  console.log('='.repeat(80));
  console.log(`- Best Model:               ${best.model}`);
  console.log(`- Best Feature Combination: ${best.experiment} (${best.feature_count} features)`);
  console.log(`- Test ROC-AUC:            ${best.test_roc_auc}`);
  console.log(`- Test PR-AUC:             ${best.test_pr_auc}`);
  console.log(`- Test F1-Score:           ${best.test_f1}`);
  console.log(`- Test Recall:             ${best.test_recall}`);
  console.log(`- Test Precision:          ${best.test_precision}`);
  console.log(`- Test Accuracy:           ${best.test_accuracy}`);
  console.log(`- Test Brier Score:        ${best.test_brier}`);
  console.log(`- Test Log Loss:           ${best.test_log_loss}`);
  console.log('='.repeat(80));
});
