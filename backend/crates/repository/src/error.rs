use sqlx::Error;
use sqlx::migrate::MigrateError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum RepositoryError {
    #[error("SQL error : {0}")]
    SQL(#[from] Error),

    #[error("SQLx migration error : {0}")]
    Migration(#[from] MigrateError)
}