let isScheduled = false;
const jobs = [];

export function enqueueJobs(job) {
	jobs.push(job);
	scheduleUpdate();
}

function scheduleUpdate() {
	if (isScheduled) return;
	isScheduled = true;
	queueMicrotask(processJobs);
}

function processJobs() {
	while (jobs.length) {
		const job = jobs.shift();
		const result = job();

		Promise.resolve(result)
			.then()
			.catch((error) => console.error(`[scheduler]: ${error}`));
	}

	isScheduled = false;
}
