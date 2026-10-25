FROM node:22-alpine AS frontend-build
WORKDIR /client
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api-build
WORKDIR /src
COPY server/Calculator.Api/Calculator.Api.csproj server/Calculator.Api/
RUN dotnet restore server/Calculator.Api/Calculator.Api.csproj
COPY server/Calculator.Api/ server/Calculator.Api/
RUN dotnet publish server/Calculator.Api/Calculator.Api.csproj --configuration Release --output /app/publish /p:UseAppHost=false
COPY --from=frontend-build /client/dist/ /app/publish/wwwroot/

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=api-build /app/publish/ ./
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Calculator.Api.dll"]

