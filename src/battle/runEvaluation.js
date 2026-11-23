import { MAX_EVALUATION_WORKERS } from './buildEvaluation';

export function runEvaluation(plan, { workerCount, signal, onProgress }) {
    return new Promise((resolve, reject) => {
        if (!Number.isInteger(workerCount) || workerCount < 1 || workerCount > MAX_EVALUATION_WORKERS) {
            reject(new Error(`Worker 数量须为 1 至 ${MAX_EVALUATION_WORKERS}`));
            return;
        }
        const workers = [];
        const activeCount = Math.min(workerCount, plan.jobCount);
        let finished = false;
        let nextJob = 0;
        let completedJobs = 0;
        let completed = 0;
        const cleanup = () => {
            finished = true;
            workers.forEach(worker => worker.terminate());
            signal.removeEventListener('abort', abort);
        };
        const fail = error => {
            if (finished) return;
            cleanup();
            reject(error);
        };
        const abort = () => fail(new DOMException('已取消模拟', 'AbortError'));
        if (signal.aborted) {
            abort();
            return;
        }
        signal.addEventListener('abort', abort, { once: true });
        const dispatch = worker => {
            if (nextJob < plan.jobCount) worker.postMessage(plan.job(nextJob++));
        };

        try {
            onProgress(completed, plan.total, activeCount);
            for (let i = 0; i < activeCount; i++) {
                const worker = new Worker(new URL('./buildEvaluation.worker.js', import.meta.url), { type: 'module' });
                workers.push(worker);
                worker.onmessage = ({ data }) => {
                    if (finished) return;
                    try {
                        if (data.error) throw new Error(data.error);
                        completed += data.advanced;
                        onProgress(completed, plan.total, activeCount);
                        if (!data.row) return;
                        plan.record(data.index, data.row);
                        if (++completedJobs === plan.jobCount) {
                            const report = plan.report();
                            cleanup();
                            resolve(report);
                        } else {
                            dispatch(worker);
                        }
                    } catch (error) {
                        fail(error);
                    }
                };
                worker.onerror = event => fail(new Error(event.message || '无法运行评测线程'));
                worker.onmessageerror = () => fail(new Error('无法读取评测线程的结果'));
                dispatch(worker);
            }
        } catch (error) {
            fail(error);
        }
    });
}
