export const retry = async (fn: Function, retries = 3, delay = 100) => {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt < retries - 1) {
                await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
};
