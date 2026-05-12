FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001
CMD ["npx", "ts-node", "src/index.ts"]
