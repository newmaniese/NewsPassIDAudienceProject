/**
 * Mock implementation of the fetch API for testing
 */

export const mockFetch = (response: any = {}, ok = true) => {
  return jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(response)
    })
  );
};

export const mockFetchError = (error = new Error('Network error')) => {
  return jest.fn().mockRejectedValue(error);
};
