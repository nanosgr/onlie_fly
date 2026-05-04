"""add_hora_real_to_registros_vuelo

Revision ID: 14c3aa830592
Revises: acc64e142279
Create Date: 2026-05-03 23:41:22.441626

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '14c3aa830592'
down_revision = 'acc64e142279'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('registros_vuelo', sa.Column('hora_inicio_real', sa.Time(), nullable=True))
    op.add_column('registros_vuelo', sa.Column('hora_fin_real', sa.Time(), nullable=True))


def downgrade() -> None:
    op.drop_column('registros_vuelo', 'hora_fin_real')
    op.drop_column('registros_vuelo', 'hora_inicio_real')
