import axios, { type AxiosError } from 'axios';
import { env } from '../env';
import { logger } from '../logger';
import type { ApiErrorResponse } from './errors';

export const api = axios.create({
  baseURL: env.apiUrl,
  headers: {
    Accept: 'application/json',
  },
  timeout: 30_000,
  withCredentials: true,
  // Express expects repeated keys (`topic=a&topic=b`), not `topic[]=a`.
  paramsSerializer: {
    serialize: (params) => {
      const search = new URLSearchParams();

      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) {
          continue;
        }

        if (Array.isArray(value)) {
          for (const item of value) {
            if (item === undefined || item === null || item === '') {
              continue;
            }
            search.append(key, String(item));
          }
          continue;
        }

        search.append(key, String(value));
      }

      return search.toString();
    },
  },
});

api.interceptors.request.use((config) => {
  logger.debug('API request', {
    method: config.method?.toUpperCase(),
    url: config.url,
  });
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    logger.error('API request failed', {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.error?.message ?? error.message,
    });
    return Promise.reject(error);
  },
);

export function getApiBaseUrl(): string {
  return env.apiUrl;
}
