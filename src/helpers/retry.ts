export const retry = async (fn: Function, retries = 3, delay = 100) => {
    let lastError;

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < retries - 1) {
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
};
