import sys
from pathlib import Path

# Ensure backend root and src are on the path when run directly
_root = Path(__file__).parent.parent
for _p in [str(_root), str(_root / "src")]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from datetime import datetime

import typer
from sqlmodel import Session, select

from src.snowball.adapters.db.models import UserModel
from src.snowball.adapters.db.repositories import SqlAlchemyAuthRepository, SqlAlchemyAssetRepository
from src.snowball.adapters.external.market_data import RealMarketDataProvider
from src.snowball.infrastructure.db import engine
from src.snowball.infrastructure.security import PasswordHasher
from src.snowball.use_cases.assets import UpdateAssetPricesUseCase

app = typer.Typer(help="Snowball 관리 CLI")


@app.command()
def list_users():
    """가입된 사용자 목록 조회 (아이디 찾기)"""
    with Session(engine) as session:
        users = session.exec(select(UserModel)).all()
        if not users:
            typer.echo("등록된 사용자가 없습니다.")
            return
        typer.echo("등록된 사용자:")
        for i, user in enumerate(users, 1):
            typer.echo(f"  {i}. {user.email}  (가입일: {user.created_at.strftime('%Y-%m-%d')})")
        typer.echo(f"\n총 {len(users)}명")


@app.command()
def reset_password(
    email: str = typer.Argument(..., help="사용자 이메일"),
    new_password: str = typer.Argument(..., help="새 비밀번호"),
):
    """비밀번호 재설정"""
    with Session(engine) as session:
        repo = SqlAlchemyAuthRepository(session)
        user = repo.get_by_email(email)
        if not user:
            typer.echo(f"❌ 사용자를 찾을 수 없습니다: {email}", err=True)
            raise typer.Exit(1)

        user.password_hash = PasswordHasher.get_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        repo.save(user)
        typer.echo(f"✅ 비밀번호가 변경되었습니다: {email}")


@app.command()
def update_prices():
    """모든 사용자 자산의 현재가를 시장 데이터로 갱신 (배치 전용)"""
    with Session(engine) as session:
        asset_repo = SqlAlchemyAssetRepository(session)
        market_data = RealMarketDataProvider()
        use_case = UpdateAssetPricesUseCase(asset_repo, market_data)
        count = use_case.execute()
        typer.echo(f"✅ {count}개 자산 현재가 갱신 완료")


if __name__ == "__main__":
    app()
