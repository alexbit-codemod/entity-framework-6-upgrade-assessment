using System.Data.Entity;

namespace Sample
{
    public class Repo
    {
        public int Run(params object[] args)
        {
            return Database.ExecuteSqlCommand("SELECT {0}", args);
        }
    }
}
