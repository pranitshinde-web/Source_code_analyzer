from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.services.auth import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token
from pydantic import BaseModel

router = APIRouter()

class UserCreate(BaseModel):
    username: str
    password: str

class TokenRefresh(BaseModel):
    token: str

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    new_user = User(username=user.username, hashed_password=get_password_hash(user.password))
    db.add(new_user)
    db.commit()
    return {"message": "User registered successfully"}

@router.post("/login")
def login(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token({"sub": db_user.username, "user_id": db_user.id})
    refresh_token = create_refresh_token({"sub": db_user.username, "user_id": db_user.id})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/refresh")
def refresh(body: TokenRefresh):
    payload = decode_token(body.token)
    if not payload.get("refresh"):
        raise HTTPException(status_code=401, detail="Invalid token type")
    
    access_token = create_access_token({"sub": payload["sub"], "user_id": payload["user_id"]})
    return {"access_token": access_token, "token_type": "bearer"}
