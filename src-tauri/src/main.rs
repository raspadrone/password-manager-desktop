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

#[tauri::command]
async fn create_password(
    store: tauri::State<'_, AppState>,
    token: String,
    _key: String,
    _value: String,
    _notes: Option<String>,
) -> Result<PasswordResponse, String> {
    // 1. Authenticate the command
    let _user_id = validate_token(&token, &store.jwt_secret)?;

    // 2. Get DB connection
    let mut conn = store.db_pool.get().await.map_err(|e| e.to_string())?;

    // 3. Prepare and execute the query
    let new_password = NewPassword {
        key: &_key,
        value: &_value,
        notes: _notes.as_deref(), // Convert Option<String> to Option<&str>
        user_id: _user_id,
    };

    let created_password = diesel::insert_into(passwords::table)
        .values(&new_password)
        .get_result::<Password>(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    // 4. Return the safe DTO
    Ok(created_password.into())
}

// --- Tauri Command ---
#[tauri::command]
async fn login(
    store: tauri::State<'_, AppState>,
    username_param: String,
    password_param: String,
) -> Result<String, String> {
    let mut conn = store.db_pool.get().await.map_err(|e| format!("{:?}", e))?;

    let user = users
        .filter(username.eq(&username_param))
        .select((users::id, users::username, users::hashed_password))
        .first::<DbUser>(&mut conn)
        .await
        .map_err(|e| format!("{:?}", e))?;

    let parsed_hash = PasswordHash::new(&user.hashed_password)
        .map_err(|e| format!("Failed to parse password hash: {}", e))?;

    let argon2 = Argon2::default();
    argon2
        .verify_password(password_param.as_bytes(), &parsed_hash)
        .map_err(|_| "Invalid password".to_string())?;

    let now = Utc::now();
    let expiration = (now + Duration::hours(1)).timestamp();

    let claims = Claims {
        sub: user.id.to_string(),
        exp: expiration,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(store.jwt_secret.as_bytes()),
    )
    .map_err(|e| format!("Failed to generate token: {}", e))?;

    Ok(token)
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
        .invoke_handler(tauri::generate_handler![login, create_password])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
