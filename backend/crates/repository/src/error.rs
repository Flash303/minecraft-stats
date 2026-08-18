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

impl RepositoryError {
    pub fn is_unique_violation(&self) -> bool {
        if let RepositoryError::SQL(sqlx::Error::Database(err)) = self {
            err.is_unique_violation()
        } else {
            false
        }
    }
}