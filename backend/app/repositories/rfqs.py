from psycopg.rows import dict_row

from app.core.database import open_connection


def find_rfq(rfq_id: int):
    with open_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT id, part_number, description, quantity, needed_by
                FROM public.rfqs
                WHERE id = %s
                """,
                (rfq_id,),
            )
            rfq = cursor.fetchone()
            if rfq is None:
                return None

            cursor.execute(
                """
                SELECT id, supplier_name, unit_price, lead_time_days, valid_until
                FROM public.quotes
                WHERE rfq_id = %s
                ORDER BY id
                """,
                (rfq_id,),
            )
            rfq["quotes"] = cursor.fetchall()

    return rfq


def list_rfqs():
    with open_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT id, part_number, description, quantity, needed_by
                FROM public.rfqs
                ORDER BY id DESC
                """
            )
            rfqs = cursor.fetchall()

            cursor.execute(
                """
                SELECT id, rfq_id, supplier_name, unit_price,
                       lead_time_days, valid_until
                FROM public.quotes
                ORDER BY id
                """
            )
            quotes = cursor.fetchall()

    quotes_by_rfq = {rfq["id"]: [] for rfq in rfqs}

    for quote in quotes:
        if quote["rfq_id"] in quotes_by_rfq:
            quotes_by_rfq[quote["rfq_id"]].append(quote)

    for rfq in rfqs:
        rfq["quotes"] = quotes_by_rfq[rfq["id"]]

    return rfqs

def insert_rfq(part_number: str, description: str, quantity: int, needed_by):
    with open_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO public.rfqs (part_number, description, quantity, needed_by)
                VALUES (%s, %s, %s, %s)
                RETURNING id, part_number, description, quantity, needed_by
                """,
                (part_number, description, quantity, needed_by),
            )
            return cursor.fetchone()


def insert_quote(rfq_id, supplier_name, unit_price, lead_time_days, valid_until):
    with open_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO public.quotes
                    (rfq_id, supplier_name, unit_price, lead_time_days, valid_until)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, rfq_id, supplier_name, unit_price,
                          lead_time_days, valid_until
                """,
                (rfq_id, supplier_name, unit_price, lead_time_days, valid_until),
            )
            return cursor.fetchone()


def update_rfq(rfq_id, part_number, description, quantity, needed_by):
    with open_connection() as connection:
        return connection.execute(
            """
            UPDATE public.rfqs
            SET part_number = %s, description = %s, quantity = %s, needed_by = %s
            WHERE id = %s
            """,
            (part_number, description, quantity, needed_by, rfq_id),
        ).rowcount == 1


def delete_rfq(rfq_id):
    with open_connection() as connection:
        # Lock the parent before deleting its quotes to block concurrent FK inserts.
        rfq = connection.execute(
            "SELECT id FROM public.rfqs WHERE id = %s FOR UPDATE", (rfq_id,)
        ).fetchone()
        if rfq is None:
            return False

        connection.execute("DELETE FROM public.quotes WHERE rfq_id = %s", (rfq_id,))
        connection.execute("DELETE FROM public.rfqs WHERE id = %s", (rfq_id,))
        return True


def update_quote(rfq_id, quote_id, supplier_name, unit_price, lead_time_days, valid_until):
    with open_connection() as connection:
        return connection.execute(
            """
            UPDATE public.quotes
            SET supplier_name = %s, unit_price = %s, lead_time_days = %s, valid_until = %s
            WHERE rfq_id = %s AND id = %s
            """,
            (supplier_name, unit_price, lead_time_days, valid_until, rfq_id, quote_id),
        ).rowcount == 1


def delete_quote(rfq_id, quote_id):
    with open_connection() as connection:
        return connection.execute(
            "DELETE FROM public.quotes WHERE rfq_id = %s AND id = %s",
            (rfq_id, quote_id),
        ).rowcount == 1
