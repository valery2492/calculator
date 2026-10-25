Warning: truncated output (original token count: 1229)
Total output lines: 86

using Npgsql;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("Supabase");
if (string.IsNullOrWhiteSpace(connectionString))
    connectionString = Environment.GetEnvironmentVariable("SUPABASE_DB_CONNECTION");
var allowedOrigin = builder.Configuration["FrontendOrigin"] ?? Environment.GetEnvironmentVariable("FRONTEND_ORIGIN") ?? "http://localhost:5173";
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.WithOrigins(allowedOrigin).AllowAnyHeader().AllowAnyMethod()));
if (!string.IsNullOrWhiteSpace(connectionString))
    builder.Services.AddSingleton(_ => NpgsqlDataSource.Create(connectionString));

var app = builder.Build();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseCors();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", databaseConfigured = !string.IsNullOrWhiteSpace(connectionString) }));

app.MapPost("/api/calculations", async (CalculationRequest request, IServiceProvider services, CancellationToken cancellationToken) =>
{
    if (!double.IsFinite(request.Left) || !double.IsFinite(request.Right))
        return Results.BadRequest(new { message = "Both values must be finite numbers." });
    if (request.ClientId == Guid.Empty)
        return Results.BadRequest(new { message = "A valid browser history ID is required." });

    var operation = request.Operation.Trim().ToLowerInvariant();
    double result = operation switch
    {
        "add" => request.Left + request.Right,
        "subtract" => request.Left - request.Right,
        "multiply" => request.Left * request.Right,
        "divide" when request.Right != 0 => request.Left / request.Right,
        "divide" => double.NaN,
        "percentage" => request.Left * request.Right / 100,
        _ => double.NaN
    };
    if (operation is not ("add" or "subtract" or "multiply" or "divide" or "percentage"))
        return Results.BadRequest(new { message = "Choose add, subtract, multiply, divide, or percentage." });
    if (!double.IsFinite(result))
        return Results.BadRequest(new { message = operation == "divide" ? "Division by zero is not allowed." : "The result is outside the calculator's supported range." });

    if (services.GetService<NpgsqlDataSource>() is not { } dataSource)
        return Results.Problem("Database is not configured. S…29 tokens truncated… using var command = dataSource.CreateCommand("""
        INSERT INTO public.calculation_history (client_id, left_value, operation, right_value, result)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, left_value, operation, right_value, result, created_at;
        """);
    command.Parameters.AddWithValue(request.ClientId);
    command.Parameters.AddWithValue(request.Left);
    command.Parameters.AddWithValue(operation);
    command.Parameters.AddWithValue(request.Right);
    command.Parameters.AddWithValue(result);
    await using var reader = await command.ExecuteReaderAsync(cancellationToken);
    await reader.ReadAsync(cancellationToken);
    return Results.Ok(new CalculationEntry(reader.GetGuid(0), reader.GetDouble(1), reader.GetString(2), reader.GetDouble(3), reader.GetDouble(4), reader.GetDateTime(5)));
});

app.MapGet("/api/calculations", async (int? limit, Guid clientId, IServiceProvider services, CancellationToken cancellationToken) =>
{
    if (clientId == Guid.Empty)
        return Results.BadRequest(new { message = "A valid browser history ID is required." });
    if (services.GetService<NpgsqlDataSource>() is not { } dataSource)
        return Results.Problem("Database is not configured. Set SUPABASE_DB_CONNECTION on the API server.", statusCode: StatusCodes.Status503ServiceUnavailable);
    await using var command = dataSource.CreateCommand("""
        SELECT id, left_value, operation, right_value, result, created_at
        FROM public.calculation_history
        WHERE client_id = $1
        ORDER BY created_at DESC
        LIMIT $2;
        """);
    command.Parameters.AddWithValue(clientId);
    command.Parameters.AddWithValue(Math.Clamp(limit ?? 8, 1, 100));
    await using var reader = await command.ExecuteReaderAsync(cancellationToken);
    var entries = new List<CalculationEntry>();
    while (await reader.ReadAsync(cancellationToken))
        entries.Add(new CalculationEntry(reader.GetGuid(0), reader.GetDouble(1), reader.GetString(2), reader.GetDouble(3), reader.GetDouble(4), reader.GetDateTime(5)));
    return Results.Ok(entries);
});

app.MapFallbackToFile("index.html");
app.Run();

record CalculationRequest(double Left, double Right, string Operation, Guid ClientId);
record CalculationEntry(Guid Id, double Left, string Operation, double Right, double Result, DateTime CreatedAt);

