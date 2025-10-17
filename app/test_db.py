import pandas as pd
from bson import ObjectId

from dao import user_dao

if __name__ == '__main__':
    filepath = "/home/hoangson/Downloads/DS đại biểu.xlsx"
    sheets = pd.ExcelFile(filepath)

    for sheet in sheets.sheet_names:
        df = pd.read_excel(sheets, sheet_name=sheet)
        df = df.where(pd.notnull(df), None)

        for idx, row in df.iterrows():
            try:
                # user_id is str or int
                user = user_dao.find_one({"$or": [{"user_id": str(row['Ma_db'])}, {"user_id": int(row['Ma_db'])}]})
                if user is None:
                    print(f"User {row['Ma_db']} not found, skipping...")
                    continue
                # update name and title
                user_dao.update_many(
                    {"_id": ObjectId(user['_id'])},
                    {"$set": {
                        "user_id": str(row['Ma_db']),
                        "name": row['Ho_va_ten'],
                        "title": row['Chuc_vu'],
                    }}
                )
            except Exception as e:
                print(f"Error at row {idx}: {e}")
                continue
