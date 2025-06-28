// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// --- Imports ---
#![allow(unused)]

use argon2::{Argon2, password_hash::SaltString};
use argon2::{PasswordHash, PasswordHasher, PasswordVerifier};
// use axum::Extension;
// use axum::body::Body;
// use axum::extract::Query;
// use axum::http::{HeaderValue, Method, Request, header};
// use axum::middleware::Next;
// use axum::response::Response;
// use axum::{
//     Json, Router,
//     extract::{Path, State},
//     http::StatusCode,
//     response::IntoResponse,
//     routing::{delete, get, post, put},
// };
// use axum_extra::headers::authorization::Bearer;
// use axum_extra::headers::{Authorization, HeaderMapExt};
use chrono::{DateTime, Duration, Utc};
use deadpool::managed::Object;
use diesel::prelude::{Insertable, Queryable};
use diesel::result::Error;
use dotenvy::dotenv;
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use rand::rng;
use rand::seq::{IndexedRandom, SliceRandom};
use rand_core::OsRng;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::types::uuid;
use tauri::Manager;
use tower_http::cors::CorsLayer;

use std::{borrow::Cow, env, net::SocketAddr, process};
use tokio::net::TcpListener;
use uuid::Uuid;

use crate::schema::passwords;
use crate::schema::users; // Import 'users' table definition

use diesel::AsChangeset;
use diesel_async::AsyncPgConnection;
use diesel_async::pooled_connection::AsyncDieselConnectionManager;

use crate::schema::passwords::dsl::*;
use crate::schema::users::dsl::*;
use diesel::prelude::*;
use diesel_async::RunQueryDsl;

pub type DbPool = deadpool::managed::Pool<AsyncDieselConnectionManager<AsyncPgConnection>>;

mod schema;

// --- Schema & Data Structs ---
use schema::users::dsl::*;

#[derive(Clone)]
struct AppState {
    db_pool: DbPool,
    jwt_secret: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    exp: i64,
}

#[derive(Deserialize)]
struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Serialize)]
struct LoginResponse {
    token: String,
}

#[derive(Deserialize)]
struct GeneratePasswordRequest {
    #[serde(default = "default_password_length")]
    length: u8,
    #[serde(default)]
    include_uppercase: bool,
    #[serde(default)]
    include_numbers: bool,
    #[serde(default)]
    include_symbols: bool,
}

fn default_password_length() -> u8 {
    12
}

#[derive(Debug)]
pub enum AppError {
    // record not found in db
    NotFound,
    // general db error
    DatabaseError(Error),
    Conflict(String),
    // conn error
    PoolError(deadpool::managed::PoolError<diesel_async::pooled_connection::PoolError>),
    // auth errors
    InvalidToken,
    MissingToken,
    ExpiredToken,
    // general server error
    InternalServerError(String),
}

#[derive(Serialize)]
struct ApiError {
    error: String,
    code: u16,
}

#[derive(Debug, Clone, PartialEq, Queryable, Insertable, Serialize)]
#[diesel(table_name = schema::users)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub hashed_password: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Insertable)]
#[diesel(table_name = users)]
pub struct NewUser<'a> {
    pub username: &'a str,
    pub hashed_password: &'a str,
}

#[derive(Queryable, Debug)]
#[diesel(table_name = users)]
struct DbUser {
    id: uuid::Uuid,
    username: String,
    hashed_password: String,
}

#[derive(Queryable, Debug, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub username: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Insertable)]
#[diesel(table_name = passwords)]
pub struct NewPassword<'a> {
    pub key: &'a str,
    pub value: &'a str,
    pub user_id: Uuid,
    pub notes: Option<&'a str>,
}

#[derive(Debug, Clone, PartialEq, Queryable, Insertable, Serialize)]
#[diesel(table_name = schema::passwords)]
pub struct Password {
    pub id: Uuid,
    pub key: String,
    pub value: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub user_id: Uuid,
    pub notes: Option<String>,
}

#[derive(Serialize)]
pub struct PasswordResponse {
    pub id: Uuid,
    pub key: String,
    // Notice: no 'value' field!
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub user_id: Uuid,
    pub notes: Option<String>,
}

#[derive(Deserialize, Serialize, Debug)]
struct PasswordEntry {
    key: String,
    value: String,
}

#[derive(Deserialize, AsChangeset)]
#[diesel(table_name = passwords)]
struct PasswordEntryUpdate {
    value: String,
    pub notes: Option<String>,
}

#[derive(Deserialize, Debug)]
struct RegisterRequest {
    username: String,
    password: String,
}

impl From<Password> for PasswordResponse {
    fn from(p: Password) -> Self {
        Self {
            id: p.id,
            key: p.key,
            created_at: p.created_at,
            updated_at: p.updated_at,
            user_id: p.user_id,
            notes: p.notes,
        }
    }
}

// This helper function takes a token and returns the user_id if it's valid
fn validate_token(token: &str, secret: &str) -> Result<Uuid, String> {
    let decoding_key = DecodingKey::from_secret(secret.as_bytes());

    let token_data = decode::<Claims>(token, &decoding_key, &Validation::default())
        .map_err(|e| format!("Invalid token: {}", e))?;

    Uuid::parse_str(&token_data.claims.sub).map_err(|_| "Invalid user ID in token".to_string())
}

async fn state_conn_token(
    app: &tauri::AppHandle,
    token: String,
) -> Result<
    (
        Object<AsyncDieselConnectionManager<AsyncPgConnection>>,
        Uuid,
    ),
    String,
> {
    let state = app.state::<AppState>();
    let mut conn = state.db_pool.get().await.map_err(|e| e.to_string())?;
    let user_id_from_token = validate_token(&token, &state.jwt_secret)?;
    Ok((conn, user_id_from_token))
}

#[tauri::command]
async fn create_password(
    app: tauri::AppHandle,
    token: String,
    some_key: String,
    some_value: String,
    some_notes: Option<String>,
) -> Result<PasswordResponse, String> {
    let (mut conn, auth_user_id) = state_conn_token(&app, token).await?;
    let new_password = NewPassword {
        key: &some_key,
        value: &some_value,
        notes: some_notes.as_deref(), // Convert Option<String> to Option<&str>
        user_id: auth_user_id,
    };

    let created_password = diesel::insert_into(passwords::table)
        .values(&new_password)
        .get_result::<Password>(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    // 4. Return the safe DTO
    Ok(created_password.into())
}

#[tauri::command]
async fn get_all_passwords(app: tauri::AppHandle, token: String) -> Result<Vec<Password>, String> {
    let (mut conn, auth_user_id) = state_conn_token(&app, token).await?;
    let result = passwords // Start with the 'passwords' table from the schema
        .filter(user_id.eq(auth_user_id)) // Find all passwords for this user
        .load::<Password>(&mut conn) // Execute the query and load results into a Vec<Password>
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
async fn delete_password(
    app: tauri::AppHandle,
    token: String,
    some_key: String,
) -> Result<PasswordResponse, String> {
    let (mut conn, auth_user_id) = state_conn_token(&app, token).await?;

    let deleted_pass = diesel::delete(
        passwords
            .filter(key.eq(&some_key))
            .filter(user_id.eq(auth_user_id)),
    )
    .get_result::<Password>(&mut conn)
    .await
    .map_err(|e| e.to_string())?;

    Ok(deleted_pass.into())
}

#[tauri::command]
async fn register(
    app: tauri::AppHandle,
    username_param: String,
    password_param: String,
) -> Result<UserResponse, String> {
    let state = app.state::<AppState>();
    let mut conn = state.db_pool.get().await.map_err(|e| e.to_string())?;

    // Hash the password
    let salt = SaltString::generate(&mut OsRng);
    let hashed_pass = Argon2::default()
        .hash_password(password_param.as_bytes(), &salt)
        .map_err(|e| e.to_string())?
        .to_string();

    // Prepare the new user for insertion
    let new_user = NewUser {
        username: &username_param,
        hashed_password: &hashed_pass,
    };

    // Insert the user and return the specified fields
    let user = diesel::insert_into(users::table)
        .values(&new_user)
        .returning((users::id, users::username, users::created_at))
        .get_result::<UserResponse>(&mut conn)
        .await
        .map_err(|_| "Username may already be taken.".to_string())?;

    Ok(user)
}

#[tauri::command]
async fn login(
    app: tauri::AppHandle,
    username_param: String,
    password_param: String,
) -> Result<String, String> {
    let state = app.state::<AppState>();

    let mut conn = state.db_pool.get().await.map_err(|e| e.to_string())?;

    let user = users
        .filter(username.eq(&username_param))
        .select((users::id, users::username, users::hashed_password))
        .first::<DbUser>(&mut conn)
        .await
        .map_err(|_| "Invalid username or password".to_string())?;

    let parsed_hash = PasswordHash::new(&user.hashed_password)
        .map_err(|e| format!("Internal server error: {}", e))?;

    let argon2 = Argon2::default();
    if argon2
        .verify_password(password_param.as_bytes(), &parsed_hash)
        .is_err()
    {
        return Err("Invalid username or password".to_string());
    }

    let now = Utc::now();
    let expiration = (now + Duration::hours(1)).timestamp();

    let claims = Claims {
        sub: user.id.to_string(),
        exp: expiration,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.jwt_secret.as_bytes()),
    )
    .map_err(|e| format!("Failed to generate token: {}", e))?;

    Ok(token)
}

#[tauri::command]
fn generate_password(
    length: u8,
    include_uppercase: bool,
    include_numbers: bool,
    include_symbols: bool,
) -> String {
    // This is the same logic from your original Axum handler
    let mut rng = rand::thread_rng();
    let mut password_chars = Vec::new();
    let mut char_set: Vec<char> = ('a'..='z').collect();

    if include_uppercase {
        let uppercase_chars: Vec<char> = ('A'..='Z').collect();
        char_set.extend(&uppercase_chars);
        password_chars.push(*uppercase_chars.choose(&mut rng).unwrap());
    }
    if include_numbers {
        let number_chars: Vec<char> = ('0'..='9').collect();
        char_set.extend(&number_chars);
        password_chars.push(*number_chars.choose(&mut rng).unwrap());
    }
    if include_symbols {
        let symbol_chars: Vec<char> = "!@#$%^&*()_+-=[]{}|;:,.<>?".chars().collect();
        char_set.extend(&symbol_chars);
        password_chars.push(*symbol_chars.choose(&mut rng).unwrap());
    }

    let remaining_length = length.saturating_sub(password_chars.len() as u8);
    for _ in 0..remaining_length {
        password_chars.push(*char_set.choose(&mut rng).unwrap());
    }

    password_chars.shuffle(&mut rng);
    password_chars.into_iter().collect()
}

// --- Main Application Entry Point ---
fn main() {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    let manager = AsyncDieselConnectionManager::<AsyncPgConnection>::new(database_url);
    let pool = deadpool::managed::Pool::builder(manager)
        .build()
        .expect("Failed to create database pool.");

    tauri::Builder::default()
        .manage(AppState {
            db_pool: pool,
            jwt_secret,
        })
        .invoke_handler(tauri::generate_handler![
            login,
            create_password,
            get_all_passwords,
            delete_password,
            register
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
