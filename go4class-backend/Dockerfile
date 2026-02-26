# ---------- BUILD STAGE ----------
FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /app

COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -DskipTests


# ---------- RUNTIME STAGE ----------
FROM gcr.io/distroless/java21-debian12

WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65 -XX:InitialRAMPercentage=30 -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError -XX:MaxMetaspaceSize=128m"

EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]