FROM node:22-alpine AS build

WORKDIR /repo

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsdown.config.ts ./
COPY src ./src
COPY examples/react-web/package.json ./examples/react-web/package.json
RUN pnpm install --frozen-lockfile
RUN pnpm build

WORKDIR /repo/examples/react-web
COPY examples/react-web ./
RUN pnpm build

EXPOSE 5173
CMD ["pnpm", "preview"]
