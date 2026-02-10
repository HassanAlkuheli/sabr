# ── Stage 1: Build ──
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# Accept build-time API URL (defaults to /api for same-origin reverse proxy)
ARG API_URL=/api
RUN sed -i "s|apiUrl:.*|apiUrl: '${API_URL}',|" src/environments/environment.ts

RUN npx ng build --configuration production

# ── Stage 2: Serve with nginx ──
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.prod.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
