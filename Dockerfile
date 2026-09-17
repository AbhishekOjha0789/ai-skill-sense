FROM node:20-alpine

# Install required system dependencies for Prisma on Alpine Linux
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 5000

# Automatically push the Prisma schema to Supabase on startup, then start the server
CMD ["sh", "-c", "npx prisma db push && npm run dev"]